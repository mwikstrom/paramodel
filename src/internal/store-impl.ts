import deepEqual from "deep-equal";
import { JsonValue, jsonValueType, positiveIntegerType, recordType, Type, TypeOf } from "paratype";
import { ActionOptions, ActionResultType } from "../action";
import { ChangeType } from "../change";
import { DomainDriver, FilterSpec, InputRecord, OutputRecord } from "../driver";
import { EntityProjectionState, EntityProjection } from "../entity-projection";
import { EntityView, ReadonlyEntityCollection } from "../entity-view";
import { DomainModel, Forbidden } from "../model";
import { AnyProjection, View, ViewOf, ViewSnapshotFunc } from "../projection";
import { QueryHandler } from "../query-handler";
import { QueryView } from "../query-view";
import { Queryable } from "../queryable";
import { StateProjection } from "../state-projection";
import { StateView } from "../state-view";
import { 
    DomainStore, 
    DomainStoreStatus, 
    ErrorFactory, 
    PurgeOptions, 
    PurgeResult, 
    ReadOptions, 
    SyncOptions, 
    ViewOptions, 
    ViewStatus 
} from "../store";
import { _ActionContextImpl } from "./action-context-impl";
import { _Commit, _commitType, _getChangesFromCommit } from "./commit";
import { _parseVersionFromViewStateRowKey, _partitionKeys, _rowKeys } from "./data-keys";
import { _logInfo } from "./log";
import { _QueryImpl } from "./query-impl";
import { _DriverQuerySource, _QuerySource } from "./query-source";
import { _getMinSyncVersion, _MaterialViewKind, _materialViewKindType, _viewHeader, _ViewHeader } from "./view-header";

// TODO: Continuation tokens must include version and timestamp and shall expire when too old
//       (older than purge ttl) - or be renewed in case version is still not purged!

/** @internal */
export class _StoreImpl<Model extends DomainModel> implements DomainStore<Model> {
    readonly #driver: DomainDriver;
    readonly #id: string;
    readonly #model: Model;
    readonly #scope: TypeOf<Model["scope"]>;
    readonly #commitSource: _QuerySource<_Commit>;

    constructor(driver: DomainDriver, id: string, model: Model, scope: TypeOf<Model["scope"]>) {
        this.#driver = driver;
        this.#id = id;
        this.#model = model;
        this.#scope = scope;
        this.#commitSource = new _DriverQuerySource(
            this.#driver,
            this.#id,
            _partitionKeys.commits,
            record => _commitType.fromJsonValue(record.value)
        );
    }

    #getEntityValidUntilToBeWritten = async (
        viewKey: string,
        entityKeyProp: string,
        entityKeyValue: string,
        validFrom: number,        
    ): Promise<number> => {
        const envelopeType = entityEnvelopeType(jsonValueType);
        const transform = (record: OutputRecord): EntityEnvelope<JsonValue> => {
            const { value } = record;
            return envelopeType.fromJsonValue(value);
        };
        const partitionKey = _partitionKeys.view(viewKey);
        const source = new _DriverQuerySource(
            this.#driver,
            this.#id,
            partitionKey,
            transform,
        );
        const where: FilterSpec[] =[
            {
                path: ["key"],
                operator: "!=",
                operand: _rowKeys.viewHeader,
            },
            {
                path: ["value", "entity", entityKeyProp],
                operator: "==",
                operand: entityKeyValue,
            },
        ];
        const first = await new _QueryImpl(source, ["value"], Object.freeze(where))
            .by("valid_from")
            .where("valid_from", ">", validFrom)
            .first();
        
        return first ? first.valid_from - 1 : INF_VERSION;
    }

    #createEntityQueryable = <T extends Record<string, unknown>>(
        viewKey: string,
        type: Type<T>,
        version: number,
        mode: "valid_range" | "valid_until" | "valid_from",
        metaMap?: WeakMap<T, EntityMetadata>,
    ): Queryable<T> => {
        const envelopeType = entityEnvelopeType(type);
        const transform = (record: OutputRecord): T => {
            const { value, key, token, ttl } = record;
            const envelope = envelopeType.fromJsonValue(value);
            const entity = envelope.entity;
            if (metaMap) {
                const meta: EntityMetadata = Object.freeze({ key, token, ttl, envelope });
                metaMap.set(entity, meta);
            }
            return entity;
        };
        const partitionKey = _partitionKeys.view(viewKey);
        const source = new _DriverQuerySource(
            this.#driver,
            this.#id,
            partitionKey,
            transform,
        );

        const where: FilterSpec[] =[
            {
                path: ["key"],
                operator: "!=",
                operand: _rowKeys.viewHeader,
            }
        ];

        if (mode === "valid_range") {
            where.push({
                path: ["value", "valid_from"],
                operator: "<=",
                operand: version,
            }, {
                path: ["value", "valid_until"],
                operator: ">=",
                operand: version,
            });
        } else if (mode === "valid_from") {
            where.push({
                path: ["value", "valid_from"],
                operator: "==",
                operand: version,
            });
        } else if (mode === "valid_until") {
            where.push({
                path: ["value", "valid_until"],
                operator: "==",
                operand: version,
            });
        } else {
            throw new Error("Invalid version mode");
        }

        return new _QueryImpl(source, ["value", "entity"], Object.freeze(where));
    }

    #createReadonlyEntityCollection = async <T extends Record<string, unknown>>(
        viewKey: string,
        definition: EntityProjection<T>,
        version: number,
        circular: readonly string[],
        authError?: ErrorFactory,
        metaMap?: WeakMap<T, EntityMetadata>,
    ): Promise<ReadonlyEntityCollection<T>> => {        
        const { auth, dependencies } = definition;
        let query = this.#createEntityQueryable(viewKey, definition.type, version, "valid_range", metaMap);

        if (authError && auth) {
            const snapshot = this.#createViewSnapshotFunc(version, dependencies, circular);
            const authed = await auth(query, this.#scope, snapshot);

            if (authed === Forbidden) {
                throw authError();
            }

            query = authed;
        }

        const get: EntityView<T>["get"] = key => query.where(definition.key, "==", key).first();
        const collection: ReadonlyEntityCollection<T> = {
            ...query,
            get,
        };

        return collection;
    }

    #createEntityView = async <T extends Record<string, unknown>>(
        viewKey: string,
        definition: EntityProjection<T>,
        version: number,
        circular: readonly string[],
        authError?: ErrorFactory,
    ): Promise<EntityView> => {        
        const { kind,  } = definition;
        const collection = await this.#createReadonlyEntityCollection(
            viewKey, 
            definition, 
            version, 
            circular, 
            authError
        );
        const view: EntityView<T> = {
            ...collection,
            kind,
            version,
        };

        return view;
    }

    #createStateView = <T>(
        viewKey: string,
        definition: StateProjection<T>,
        version: number,
        circular: readonly string[],
        authError?: ErrorFactory,
    ): StateView<T> => {
        const { kind, dependencies, auth } = definition;       
        const snapshot = this.#createViewSnapshotFunc(version, dependencies, circular);
        const authMapper = async (state: T): Promise<T> => {
            if (!authError || !auth) {
                return state;                
            }
            
            const authed = await auth(this.#scope, state, snapshot);
            if (authed === Forbidden) {
                throw authError();
            }
            
            return authed;
        };

        const read: StateView<T>["read"] = async () => {
            if (version === 0) {
                return await authMapper(definition.initial);
            }

            const mapped = await this.#fetchStateSnapshot(viewKey, definition.type, version);
            const authed = await authMapper(mapped);

            return authed;
        };
        const view: StateView<T> = Object.freeze({ kind, version, read });
        return view;
    }

    #fetchStateSnapshot = async <T>(
        viewKey: string,
        stateType: Type<T>,
        version: number,
    ): Promise<T> => {
        const output = await this.#fetchStateSnapshotRecord(viewKey, version);

        if (!output) {
            throw new Error(`State not found for view "${viewKey}" in "${this.#id}" version ${version}`);
        }

        return stateType.fromJsonValue(output.value);
    }

    #fetchStateSnapshotRecord = async (
        viewKey: string,
        version: number,
    ): Promise<OutputRecord | undefined> => {
        const partitionKey = _partitionKeys.view(viewKey);
        const source = new _DriverQuerySource(
            this.#driver,
            this.#id,
            partitionKey,
            record => record,
        );
        const output = await new _QueryImpl(source, [], [])
            .by("key", "descending")
            .where("key", "!=", _rowKeys.viewHeader)
            .where("key", "<=", _rowKeys.viewState(version))
            .first();
        return output;
    }

    #createQueryView = <P extends Record<string, unknown>, T>(
        definition: QueryHandler<P, T>,
        version: number,
        circular: readonly string[],
        authError?: ErrorFactory,
    ): QueryView<P, T> => {
        const { kind, exec, auth, dependencies } = definition;
        const snapshot = this.#createViewSnapshotFunc(version, dependencies, circular);

        const query: QueryView<P, T>["query"] = (
            authError && auth ? async params => {
                const result = await auth(exec, snapshot, params, this.#scope);
                if (result === Forbidden) {
                    throw authError();
                }
                return result;    
            } : params => exec(snapshot, params, this.#scope)
        );

        const view: QueryView<P, T> = Object.freeze({ kind, version, query });
        return view;
    }

    #createView = async (
        viewKey: string,
        version: number,
        circular: readonly string[],
        authError?: ErrorFactory,
    ): Promise<View> => {
        const definition = this.#model.views[viewKey];
        
        if (!definition) {
            throw new Error(`Cannot access unknown view: ${viewKey}`);
        }

        const view = await this.#createViewFromDefinition(definition, viewKey, version, circular, authError);
        if (!view) {
            throw new Error(`Unable to create view accessor: ${viewKey}`);
        }   
        
        return view;
    }

    #createViewFromDefinition = async <Definition extends AnyProjection>(
        definition: Definition,
        viewKey: string,
        version: number,
        circular: readonly string[],
        authError?: ErrorFactory,
    ): Promise<ViewOf<Definition> | undefined> => {
        switch (definition.kind) {
            case "entities":
                return await this.#createEntityView(
                    viewKey, 
                    definition, 
                    version, 
                    circular,
                    authError,
                ) as ViewOf<Definition>;
            case "state":
                return this.#createStateView(
                    viewKey, 
                    definition, 
                    version, 
                    circular,
                    authError,
                ) as ViewOf<Definition>;
            case "query":
                return this.#createQueryView(
                    definition,
                    version,
                    circular,
                    authError,
                ) as ViewOf<Definition>;
            default:
                return void(0);
        }
    }

    #createViewSnapshotFunc = (
        version: number,
        dependencies: ReadonlySet<string>,
        circular: readonly string[],
    ): ViewSnapshotFunc<Model["views"]> => async (key, options = {}) => {
        if (!dependencies.has(key)) {
            throw new Error(`Cannot access view '${key}' because it is not a registered dependency`);
        }

        if (circular.includes(key)) {
            throw new Error(`Detected circular view dependency: ${circular.map(item => `'${item}'`).join(" -> ")}`);
        }

        const authError = authErrorFromOptions(options);
        const view = await this.#createView(key, version, [...circular, key], authError);
        return view as ViewOf<Model["views"][typeof key]>;
    }

    #getLatestCommit = (): Promise<_Commit | undefined> => (
        new _QueryImpl(this.#commitSource, ["value"]).by("version", "descending").first()
    )

    #getCommit = async (version: number): Promise<_Commit | undefined> => {
        const record = await this.#driver.read(this.#id, _partitionKeys.commits, _rowKeys.commit(version));
        if (record) {
            return _commitType.fromJsonValue(record.value);
        }
    }

    #getSyncInfoMap = async (
        viewKeys: readonly string[]
    ): Promise<Map<string, SyncViewInfo>> => new Map<string, SyncViewInfo>(
        (await Promise.all(viewKeys.map(this.#getViewHeaderRecord))).map((record, index) => ([
            viewKeys[index],
            getSyncInfoFromRecord(record),
        ]))    
    );    

    #getViewHeaderRecord = (key: string): Promise<OutputRecord | undefined> => {
        const partition = _partitionKeys.view(key);
        const row = _rowKeys.viewHeader;
        return this.#driver.read(this.#id, partition, row);
    }

    #getViewHeader = async (key: string): Promise<_ViewHeader | undefined> => {
        const record = await this.#getViewHeaderRecord(key);
        return record && _viewHeader.fromJsonValue(record.value);
    }

    #getViewSyncVersion = async (key: string, definition?: AnyProjection): Promise<number | undefined> => {
        if (!definition) {
            definition = this.#model.views[key];
            if (!definition) {
                return void(0);
            }
        }

        if (_materialViewKindType.test(definition.kind)) {
            const header = await this.#getViewHeader(key);
            
            if (!header) {
                return 0;
            }

            if (header.kind !== definition.kind) {
                throw new Error("View header has unexpected kind");
            }

            return header.sync_version;
        } else {
            const headers = await Promise.all(this.#getMaterialViewDependencies(key).map(this.#getViewHeader));
            return _getMinSyncVersion(headers);
        }
    }

    #getMaterialViews = (filter?: readonly string[]): string[] => Object
        .entries(this.#model.views)
        .filter(([key,def]) => (filter === void(0) || filter.includes(key)) && _materialViewKindType.test(def.kind))
        .map(([key]) => key);

    #getMaterialViewDependencies = (...keys: string[]): string[] => {
        const [key, ...queue] = keys;
        const processed = new Set<string>();
        const result: string[] = [];
        
        for (let next: string | undefined = key; next !== void(0); next = queue.shift()) {
            if (processed.has(next)) {
                continue;
            }

            processed.add(next);
            
            const definition = this.#model.views[next];
            if (!definition) {
                continue;
            }

            if (_materialViewKindType.test(definition.kind)) {
                result.push(next);
            }

            for (const dependency of definition.dependencies) {
                queue.push(dependency);
            }
        }

        return result;
    };

    #getCommitQuery = (
        options: Partial<ReadOptions<string & keyof Model["events"]>>
    ): Queryable<_Commit> => {
        const { first, last, excludeFirst, excludeLast, filter } = options;
        let query = new _QueryImpl(this.#commitSource, ["value"]).by("version");

        if (typeof first === "number") {
            query = query.where("version", excludeFirst ? ">" : ">=", first);
        }

        if (typeof last === "number") {
            query = query.where("version", excludeLast ? "<" : "<=", last);
        }

        if (Array.isArray(filter)) {
            query = query.where("changes", "includes-any", filter);
        }

        return query;
    }

    #readCommits = (
        options: Partial<ReadOptions<string & keyof Model["events"]>>
    ): AsyncIterable<_Commit> => {
        const { first, excludeFirst } = options;
        const query = this.#getCommitQuery(options);
        let minVersion = 1;
        let minPosition = 1;

        if (typeof first === "number") {
            minVersion = excludeFirst ? first + 1 : first;
        }

        return {[Symbol.asyncIterator]: async function*() {
            for await (const commit of query.all()) {
                const { version, position } = commit;

                if (version < minVersion || position < minPosition) {
                    throw new Error("Detected inconsistent commit history");
                }

                yield commit;

                minVersion = version + 1;
                minPosition = position;
            }
        }};
    }

    #syncNext = async (
        infoMap: Map<string, SyncViewInfo>,
        last?: number,
        signal?: AbortSignal,
    ): Promise<number> => {
        let first: number | undefined = void(0);

        // determine first version to sync
        for (const [, info] of infoMap) {
            if (first === void(0) || info.sync_version < first) {
                first = info.sync_version + 1;
            }
        }
        
        if (first === void(0)) {
            return 0;
        }

        // determine which views to sync and possibly limit the last commit to be synced
        const viewsToSync = new Set<string>();
        for (const [key, info] of infoMap) {
            const notSynced = info.sync_version < first;
            const purged = info.purged_from_version <= first && info.purged_until_version >= first;
            if (notSynced || purged) {
                viewsToSync.add(key);
            }
            if (purged && (last === void(0) || last > info.purged_until_version)) {
                last = info.purged_until_version;
            }
        }

        // determine which events that needs to be synced
        const eventsToSync = new Set<string>();
        for (const key of viewsToSync) {
            const definition = this.#model.views[key];
            if (definition?.kind === "state" || definition?.kind === "entities") {
                definition.mutators.forEach(e => eventsToSync.add(e));
            } else {
                throw new Error(`Don't know how to sync view: ${key}`);
            }
        }

        let latest: _Commit | undefined;

        if (last === void(0)) {
            latest = await this.#getLatestCommit();
            if (!latest) {
                return 0;
            }
            last = latest.version;
        }

        if (last < first) {
            return last;
        }

        const filter = Array.from(eventsToSync);
        let synced = 0;

        for await (const commit of this.#readCommits({ first, last, filter })) {
            if (!await this.#syncCommit(commit, infoMap, viewsToSync)) {
                return synced;
            }
            synced = commit.version;
            if (signal?.aborted) {
                return synced;
            }
        }

        if (synced < last) {
            if (!latest) {
                latest = await this.#getCommit(last);
            }
            if (latest) {
                if (await this.#syncCommit(latest, infoMap, viewsToSync)) {
                    synced = latest.version;
                }                
            }
        }

        return synced;
    }

    #syncCommit = async (commit: _Commit, infoMap: Map<string, SyncViewInfo>, keys: Set<string>): Promise<boolean> => {
        for (const key of keys) {
            const info = infoMap.get(key);
            const definition = this.#model.views[key];
            
            if (!info) {
                throw new Error("Invalid view info map");
            }
            
            let modified: boolean;

            if (definition?.kind === "entities") {
                modified = await this.#syncEntities(commit, definition, key);
            } else if (definition?.kind === "state") {
                modified = await this.#syncState(commit, definition, key);
            } else {
                throw new Error(`Don't know how to sync view: ${key}`);
            }

            const newInfo = await this.#storeViewHeaderForCommit(commit, key, definition.kind, info, modified);
            if (!newInfo) {
                return false;
            }

            infoMap.set(key, newInfo);
        }

        return true;
    }

    #writeSuccess = async (partition: string, input: InputRecord): Promise<void> => {
        const output = await this.#driver.write(this.#id, partition, input);
        if (!output) {
            const existing = await this.#driver.read(this.#id, partition, input.key);
            let message = `Optimistic write failed: ${this.#id}/${partition}: Input is ${JSON.stringify(input)} `;
            if (existing) {
                message += `but existing record is ${JSON.stringify(existing)}.`;
            } else {
                message += "but there's no existing record.";
            }
            throw new Error(message);
        }
    }

    #syncEntities = async (commit: _Commit, definition: EntityProjection, viewKey: string): Promise<boolean> => {
        const changes = _getChangesFromCommit(commit, this.#model.events, definition.mutators);
        const snapshot = this.#createViewSnapshotFunc(commit.version, definition.dependencies, [viewKey]);
        const metaMap = new WeakMap<Record<string, unknown>, EntityMetadata>();
        const baseVerison = commit.version - 1;
        const base = await this.#createReadonlyEntityCollection(
            viewKey,
            definition,
            baseVerison,
            [viewKey],
            undefined,
            metaMap,
        );

        const pk = _partitionKeys.view(viewKey);
        const rk = (key: string): string => _rowKeys.entity(key, commit.version);
        const envelopeType = entityEnvelopeType(definition.type);
        const written = new Map<string, Record<string, unknown> | null>();
        const put: EntityProjectionState["put"] = props => void(written.set(props[definition.key] as string, props));
        const del: EntityProjectionState["del"] = key => void(written.set(key as string, null));
        const state: EntityProjectionState = {
            base,
            put,
            del,            
        };

        for (const change of changes) {
            await definition.apply(change, state, snapshot);
        }

        const validUntilBase = this.#createEntityQueryable(viewKey, definition.type, baseVerison, "valid_until");
        const alreadyMarkedWithValidUntil = new Set<string>();
        for await (const entity of validUntilBase.all()) {
            const key = entity[definition.key] as string;
            if (!written.has(key)) {
                throw new Error(
                    `Detected non-deterministic entity projection of view "${viewKey}". ` + 
                    `Entity "${key}" was marked as valid until ${baseVerison} in an earlier sync ` +
                    `but was not written now for commit ${commit.version}.`
                );
            }
            alreadyMarkedWithValidUntil.add(key);
        }

        const validFromCommit = this.#createEntityQueryable(viewKey, definition.type, commit.version, "valid_from");
        const alreadyWritten = new Set<string>();
        for await (const entity of validFromCommit.all()) {
            const key = entity[definition.key] as string;
            const expected = written.get(key);
            if (expected === void(0)) {
                throw new Error(
                    `Detected non-deterministic entity projection of view "${viewKey}". ` + 
                    `Entity "${key}" was marked as valid from ${commit.version} in an earlier sync ` +
                    "but was not written now."
                );
            } else if (!deepEqual(entity, expected, { strict: true })) {
                throw new Error(
                    `Detected non-deterministic entity projection of view "${viewKey}". ` + 
                    `Entity "${key}" in version ${commit.version} ` +
                    "was written with a different value in an earlier sync."
                );
            }
            alreadyWritten.add(key);
        }

        // Write the new entities (ignoring nulls - those are deletions)
        for (const [key, props] of written) {
            if (alreadyWritten.has(key)) {
                continue;
            }

            if (!props) {
                continue; // entity was deleted
            }

            const valid_until = await this.#getEntityValidUntilToBeWritten(
                viewKey, 
                definition.key, 
                key, 
                commit.version
            );
            const envelope: EntityEnvelope = {
                valid_from: commit.version,
                valid_until: valid_until,
                entity: props,
            };
            const value = envelopeType.toJsonValue(envelope, msg => new Error(`Could not serialize entity: ${msg}`));
            const input: InputRecord = {
                key: rk(key),
                value,
                replace: null,
                ttl: -1,
            };

            await this.#writeSuccess(pk, input);
        }

        // Mark written entities with 'valid_until' base version
        for (const key of written.keys()) {
            if (alreadyMarkedWithValidUntil.has(key)) {
                continue;
            }

            const entity = await base.get(key);
            
            if (!entity) {
                continue; // did not exist before
            }

            const meta = metaMap.get(entity);
            if (!meta) {
                throw new Error("Entity metadata was not populated");
            }

            if (baseVerison < meta.envelope.valid_from) {
                throw new Error("Attempt to write invalid entity envelope");
            }

            const envelope: EntityEnvelope = {
                valid_from: meta.envelope.valid_from,
                valid_until: baseVerison,
                entity: meta.envelope.entity,
            };

            const value = envelopeType.toJsonValue(
                envelope,
                msg => new Error(`Could not rewrite entity envelope: ${msg}`)
            );

            const input: InputRecord = {
                key: meta.key,
                value: value,
                replace: meta.token,
                ttl: meta.ttl,
            };

            await this.#writeSuccess(pk, input);
        }

        return written.size > 0;
    }

    #syncState = async (commit: _Commit, definition: StateProjection, key: string): Promise<boolean> => {
        const changes = _getChangesFromCommit(commit, this.#model.events, definition.mutators);
        const snapshot = this.#createViewSnapshotFunc(commit.version, definition.dependencies, [key]);
        const before = commit.version === 1 ?
            definition.initial :
            await this.#createStateView(key, definition, commit.version - 1, [key]).read();
        let after = before;      
        for (const change of changes) {
            after = await definition.apply(change, after, snapshot);
        }
        
        const jsonState = definition.type.toJsonValue(
            after,
            msg => new Error(`Could not serialize view state to json: ${msg}`)
        );

        const input: InputRecord = {
            key: _rowKeys.viewState(commit.version),
            value: jsonState,
            replace: null,
            ttl: -1,
            
        };
        await this.#writeSuccess(_partitionKeys.view(key), input);
        return commit.version === 1 || before !== after;
    }

    #storeViewHeaderForCommit = async (
        commit: _Commit,
        key: string,
        kind: _MaterialViewKind,
        prev: SyncViewInfo,
        modified: boolean
    ): Promise<SyncViewInfo | undefined> => this.#storeViewHeader(
        key, 
        prev, 
        info => getViewHeaderRecordForCommit(commit, info, kind, modified)
    );

    #storeViewHeaderForPurge = async (
        key: string,
        purgeVersion: number,
        prev: SyncViewInfo,
    ): Promise<SyncViewInfo | undefined> => {
        const definition = this.#model.views[key];
        if (!definition) {
            return void(0);
        }

        const { kind } = definition;
        if (!_materialViewKindType.test(kind)) {
            return void(0);
        }

        return await this.#storeViewHeader(
            key, 
            prev, 
            info => getViewHeaderRecordForPurge(purgeVersion, info, kind)
        );
    }

    #storeViewHeader = async (
        key: string, 
        prev: SyncViewInfo, 
        update: (info: SyncViewInfo) => InputRecord | undefined
    ): Promise<SyncViewInfo | undefined> => {
        const pk = _partitionKeys.view(key);
        for (;;) {
            const input = update(prev);
            if (!input) {
                return void(0);
            }
            
            let output = await this.#driver.write(this.#id, pk, input);

            if (output) {
                return getSyncInfoFromRecord(output);
            }

            // Update token mismatch. Read current header and try again (loop continues)
            output = await this.#driver.read(this.#id, pk, input.key);
            prev = getSyncInfoFromRecord(output);
        }
    }

    #expirePurgedViewData = async (
        key: string,
        info: SyncViewInfo,
        signal?: AbortSignal
    ): Promise<boolean> => {
        if (info.purged_from_version !== 0) {
            return false;
        }

        if (info.purged_until_version === 0) {
            return true;
        }

        const definition = this.#model.views[key];
        if (!definition) {
            return false;
        }

        const { kind } = definition;
        if (!_materialViewKindType.test(kind)) {
            return false;
        }

        if (kind === "entities") {
            return await this.#expirePurgedEntities(key, info.purged_until_version, signal);
        } else if (kind === "state") {
            return await this.#expirePurgedState(key, info.purged_until_version, signal);
        } else {
            return false;
        }
    }

    #expirePurgedEntities = (
        viewKey: string,
        purgeVersion: number,
        signal?: AbortSignal,
    ): Promise<boolean> => {
        const condition: FilterSpec = {
            path: ["value", "end"],
            operator: "<=",
            operand: purgeVersion,
        };
        return this.#expireViewRecords(viewKey, condition, signal);
    }

    #expirePurgedState = async (
        viewKey: string,
        purgeVersion: number,
        signal?: AbortSignal,
    ): Promise<boolean> => {
        const recordToKeep = await this.#fetchStateSnapshotRecord(viewKey, purgeVersion + 1);

        if (!recordToKeep) {
            return false;
        }

        const versionToKeep = _parseVersionFromViewStateRowKey(recordToKeep.key);
        if (versionToKeep <= purgeVersion) {
            purgeVersion = versionToKeep - 1;
        }

        const condition: FilterSpec = {
            path: ["key"],
            operator: "<=",
            operand: _rowKeys.viewState(purgeVersion),
        };

        return this.#expireViewRecords(viewKey, condition, signal);
    }

    #expireViewRecords = async (
        viewKey: string,
        condition: FilterSpec,
        signal?: AbortSignal,
    ): Promise<boolean> => {
        const pk = _partitionKeys.view(viewKey);
        const source = new _DriverQuerySource(this.#driver, this.#id, pk, record => record);
        const filter: FilterSpec[] = [
            {
                path: ["ttl"],
                operator: "==",
                operand: -1,
            },
            {
                path: ["key"],
                operator: "!=",
                operand: _rowKeys.viewHeader,
            },
            condition
        ];

        const query = new _QueryImpl(source, [], filter);
        for await (const before of query.all()) {
            const input: InputRecord = {
                key: before.key,
                value: before.value,
                replace: before.token,
                ttl: PURGE_TTL,
            };

            await this.#driver.write(this.#id, pk, input);

            if (signal?.aborted) {
                return false;
            }
        }

        return true;
    }

    #tryAction = async <K extends string & keyof Model["actions"]>(
        latest: _Commit | undefined,
        actionKey: K, 
        input: TypeOf<Model["actions"][K]["input"]>, 
        options: Partial<ActionOptions> = {},
    ): Promise<ActionResultType<Model, K> | undefined> => {
        const { dry = false, signal } = options;
        const base = latest?.version || 0;
        const timestamp = this.#driver.timestamp();

        if (!(actionKey in this.#model.actions)) {
            const status = "rejected";
            const message = `Unknown action: ${actionKey}`;
            return { timestamp, base, status, message };
        }
        
        const handler = this.#model.actions[actionKey];
        const inputError = handler.input.error(input);
        
        if (inputError !== void(0)) {
            const status = "rejected";
            const message = `Invalid action input: ${inputError}`;
            return { timestamp, base, status, message };
        }

        if (handler.dependencies.size > 0) {
            const synced = await this.sync({
                target: base,
                views: Array.from(handler.dependencies),
                signal,
            });

            if (synced !== base) {
                return void(0);
            }
        }

        const version = base + 1;

        if (version >= MAX_VERSION) {
            throw new Error("Commit version overflow");
        }

        const snapshot = this.#createViewSnapshotFunc(base, handler.dependencies, []);
        const fromContext = await new _ActionContextImpl(
            version,
            timestamp,
            input,
            this.#scope,
            this.#model.events,
            handler,
            snapshot,
        )._run();

        if (fromContext.status !== "success") {
            const { status, message } = fromContext;
            return { timestamp, base, status, message };
        }

        if (signal?.aborted) {
            const status = "aborted";
            const message = "Signal aborted";
            return { timestamp, base, status, message };
        }

        if (!dry) {
            const position = latest ? latest.position + latest.events.length : 1;
            const { changes, events } = fromContext;
            const commit: _Commit = {
                version,
                position,
                timestamp,
                changes,
                events,
            };

            if (!await this.#tryCommit(commit)) {
                return void(0);
            }

            _logInfo(
                "Committed version %d in \"%s\": %s", 
                version, 
                this.#id, 
                changes.join(", ")
            );
        }

        const result: ActionResultType<Model, K> = {
            timestamp,
            base,
            status: fromContext.status,
            message: fromContext.message,
            output: fromContext.output as TypeOf<Model["actions"][K]["output"]>,
            committed: dry ? void(0) : version,
            changes: fromContext.events.length,
        };
        
        return result;
    }

    #tryCommit = async (commit: _Commit): Promise<boolean> => {
        const key = _rowKeys.commit(commit.version);
        const value = _commitType.toJsonValue(commit, msg => new Error(`Failed to serialize commit: ${msg}`));
        const input: InputRecord = {
            key,
            value,
            replace: null,
            ttl: -1,
        };

        const output = await this.#driver.write(this.#id, _partitionKeys.commits, input);
        return !!output;
    };

    do = async <K extends string & keyof Model["actions"]>(
        key: K, 
        input: TypeOf<Model["actions"][K]["input"]>, 
        options: Partial<ActionOptions> = {},
    ): Promise<ActionResultType<Model, K>> => {
        let latest = await this.#getLatestCommit();
        for (;;) {
            const result = await this.#tryAction(latest, key, input, options);

            if (result !== void(0)) {
                _logInfo(
                    "Action %s completed with status %s at version %d in \"%s\": %s",
                    key,
                    result.status,
                    result.committed || result.base,
                    this.#id,
                    result.message || "(no message)",
                );
                return result;
            }

            const fresh = await this.#getLatestCommit();
            if (!fresh || fresh.version <= (latest?.version || 0)) {
                throw new Error("Detected optimistic concurrency inconsistency");
            }

            latest = fresh;
        }
    }

    read = (
        options: Partial<ReadOptions<string & keyof Model["events"]>> = {}
    ): AsyncIterable<ChangeType<Model["events"]>> => {
        const changeModel = this.#model.events;
        const readCommits = () => this.#readCommits(options);
        let filter: ReadonlySet<string> | undefined = void(0);
        if (options.filter) {
            filter = new Set(options.filter);
        }
        return {[Symbol.asyncIterator]: async function*() {
            for await (const commit of readCommits()) {
                for (const change of _getChangesFromCommit(commit, changeModel, filter)) {
                    yield change as ChangeType<Model["events"]>;
                }
            }
        }};
    }

    stat = async (): Promise<DomainStoreStatus> => {
        const materialViewKeys = this.#getMaterialViews();
        const [
            latest,
            headers,
        ] = await Promise.all([
            this.#getLatestCommit(),
            Promise.all(materialViewKeys.map(key => this.#getViewHeader(key))),
        ]);
        const views = Object.fromEntries(materialViewKeys.map((key, index) => {
            const header = headers[index];
            const viewStatus: ViewStatus = {
                sync_version: header?.sync_version || 0,
                sync_position: header?.sync_position || 0,
                sync_timestamp: header?.sync_timestamp,
                last_change_version: header?.last_change_version || 0,
                last_change_timestamp: header?.last_change_timestamp,
                purged_from_version: header?.purged_from_version || 0,
                purged_until_version: header?.purged_until_version || 0,
            };
            return [key, viewStatus];
        }));
        const result: DomainStoreStatus = {
            version: latest?.version || 0,
            position: latest?.position || 0,
            timestamp: latest?.timestamp,
            views,
        };
        return result;
    }

    sync = async (options: Partial<SyncOptions> = {}): Promise<number> => {
        const { signal, target } = options;
        const viewKeys = options.views ?
            this.#getMaterialViewDependencies(...options.views) :
            this.#getMaterialViews();
        const infoMap = await this.#getSyncInfoMap(viewKeys);

        let synced = 0;
        do { 
            const next = await this.#syncNext(infoMap, target, signal); 
            if (next > synced) {
                synced = next;
            } else {
                break;
            }
        }
        while (!signal?.aborted && synced < (target || 0));

        _logInfo("Synced %s in %s to version %d", viewKeys.join(", "), this.#id, synced);
        return synced;
    }

    purge = async (options: Partial<PurgeOptions> = {}): Promise<PurgeResult> => {
        const { signal } = options;
        const viewKeys = this.#getMaterialViews();
        const infoMap = await this.#getSyncInfoMap(viewKeys);
        const purgeVersion = _getMinSyncVersion(infoMap.values()) - 1;
        let aborted = false;

        // Phase 1: Update the purged range of all material views
        for (const key of viewKeys) {
            const oldInfo = infoMap.get(key);
            if (!oldInfo) {
                aborted = true;
            } else {
                const newInfo = await this.#storeViewHeaderForPurge(key, purgeVersion, oldInfo);
                if (!newInfo) {
                    aborted = true;
                }
            }
            
            aborted = !aborted || !signal?.aborted;           
            if (aborted) {
                break;
            }            
        }

        // Phase 2: Mark all state/entity records in the purged range with a TTL
        for (const [key, info] of infoMap) {
            aborted = aborted || !await this.#expirePurgedViewData(key, info, signal) || !!signal?.aborted;
            if (aborted) {
                break;
            }            
        }

        const done = !aborted && viewKeys.every(key => {
            const info = infoMap.get(key);
            return info && info.purged_from_version === 0 && info.purged_until_version >= purgeVersion;
        });
        
        return { done };
    }

    view = async <K extends string & keyof Model["views"]>(
        key: K, 
        options: Partial<ViewOptions> = {}
    ): Promise<ViewOf<Model["views"][K]> | undefined> => {
        const { sync = 0, signal } = options;
        const definition = this.#model.views[key];
        let version = await this.#getViewSyncVersion(key, definition);
        
        if (version === void(0)) {
            return void(0);
        }

        if (sync > version) {
            version = await this.sync({ views: [key], target: sync, signal });
            
            if (sync > version) {
                return void(0);
            }
        }

        const authError = authErrorFromOptions(options);
        const view = await this.#createViewFromDefinition(definition, key, version, [key], authError);
        return view as ViewOf<Model["views"][K]>;
    }
}

const PURGE_TTL = 3600; // 1 hour
const INF_VERSION = 9000000000000000;
const MAX_VERSION = 5000000000000000;

type EntityEnvelope<T = Record<string, unknown>> = {
    valid_from: number;
    valid_until: number;
    entity: T;
};

const entityEnvelopeType = <T>(valueType: Type<T>): Type<EntityEnvelope<T>> => recordType({
    valid_from: positiveIntegerType,
    valid_until: positiveIntegerType,
    entity: valueType,
}).restrict(
    "Entity envelope \"valid_from\" must be less than or equal to \"valid_until\"", 
    ({valid_from, valid_until}) => valid_from <= valid_until,
);

const defaultAuthError: ErrorFactory = () => new Error("Forbidden");

const authErrorFromOptions = (options: Partial<Pick<ViewOptions, "auth">>): ErrorFactory | undefined => {
    const auth = options;
    if (typeof auth === "function") {
        return auth;
    } else if (auth === true) {
        return defaultAuthError;
    } else {
        return void(0);
    }
};

// TODO: Declare using Omit<ViewHeader, "kind"> + update token
type SyncViewInfo = {
    readonly update_token: string | null;
    readonly sync_version: number;
    readonly sync_position: number;
    readonly sync_timestamp?: Date;
    readonly last_change_version: number;
    readonly last_change_timestamp?: Date;
    readonly purged_from_version: number;
    readonly purged_until_version: number;
}

const getSyncInfoFromRecord = (record: OutputRecord | undefined): SyncViewInfo => {
    let update_token: string | null = null;
    let sync_version = 0;
    let sync_position = 0;
    let sync_timestamp: Date | undefined = void(0);
    let last_change_version = 0;
    let last_change_timestamp: Date | undefined = void(0);
    let purged_from_version = 0;
    let purged_until_version = 0;

    if (record) {
        const header = _viewHeader.fromJsonValue(record.value);
        update_token = record.token;
        sync_version = header.sync_version;
        sync_position = header.sync_position;
        sync_timestamp = header.sync_timestamp;
        last_change_version = header.last_change_version;
        last_change_timestamp = header.last_change_timestamp;
        purged_from_version = header.purged_from_version;
        purged_until_version = header.purged_until_version;
    }

    return Object.freeze({
        update_token,
        sync_version, 
        sync_position,
        sync_timestamp,
        last_change_version,
        last_change_timestamp,
        purged_from_version, 
        purged_until_version, 
    });
};

const getViewHeaderRecordForPurge = (
    purgeVersion: number,
    prev: SyncViewInfo,
    kind: _MaterialViewKind,
): InputRecord | undefined => {
    const header = getViewHeaderForPurge(purgeVersion, prev, kind);
    return getViewHeaderRecord(header, prev.update_token);
};

const getViewHeaderRecordForCommit = (
    commit: _Commit,
    prev: SyncViewInfo,
    kind: _MaterialViewKind,
    modified: boolean,
): InputRecord | undefined => {
    const header = getViewHeaderForCommit(commit, prev, kind, modified);
    return getViewHeaderRecord(header, prev.update_token);
};

const getViewHeaderRecord = (
    header: _ViewHeader | undefined,
    token: string | null,
): InputRecord | undefined => {
    if(!header) {
        return void(0);
    }

    const jsonHeader = _viewHeader.toJsonValue(header, msg => new Error(`Failed to serialize view header: ${msg}`));
    const input: InputRecord = {
        key: _rowKeys.viewHeader,
        value: jsonHeader,
        replace: token,
        ttl: -1,
    };

    return input;
};

const getViewHeaderForPurge = (
    purgeVersion: number,
    prev: SyncViewInfo,
    kind: _MaterialViewKind,
): _ViewHeader | undefined => {
    if (prev.sync_version <= purgeVersion || !prev.sync_timestamp || !prev.last_change_timestamp) {
        return void(0);
    }

    const header: _ViewHeader = Object.freeze({
        kind,
        sync_version: prev.sync_version,
        sync_position: prev.sync_position,
        sync_timestamp: prev.sync_timestamp,
        last_change_version: prev.last_change_version,
        last_change_timestamp: prev.last_change_timestamp,
        purged_from_version: 0,
        purged_until_version: Math.max(prev.purged_until_version, purgeVersion),
    });

    return header;
};

const getViewHeaderForCommit = (
    commit: _Commit,
    prev: SyncViewInfo,
    kind: _MaterialViewKind,
    modified: boolean,
): _ViewHeader | undefined => {
    if (prev.sync_version < commit.version) {
        let last_change_timestamp: Date;

        if (modified) {
            last_change_timestamp = commit.timestamp;
        } else if (!prev.last_change_timestamp) {
            throw new Error("Unmodified change must have previous timestamp");
        } else {
            last_change_timestamp = prev.last_change_timestamp;
        }

        const header: _ViewHeader = Object.freeze({
            kind,
            sync_version: commit.version,
            sync_position: commit.position + commit.changes.length,
            sync_timestamp: commit.timestamp,
            last_change_version: modified ? commit.version : prev.last_change_version,
            last_change_timestamp,
            purged_from_version: prev.purged_from_version,
            purged_until_version: prev.purged_until_version,
        });

        return header;
    } else if (prev.purged_from_version <= commit.version && prev.purged_until_version >= commit.version) {
        let purged_from_version = commit.version + 1;
        let purged_until_version = prev.purged_until_version;

        if (purged_from_version > purged_until_version) {
            purged_from_version = purged_until_version = 0;
        }

        if (!prev.sync_timestamp || !prev.last_change_timestamp) {
            throw new Error("Non-latest change must have previous timestamp");
        }

        const header: _ViewHeader = Object.freeze({
            kind,
            sync_version: prev.sync_version,
            sync_position: prev.sync_position,
            sync_timestamp: prev.sync_timestamp,
            last_change_version: prev.last_change_version,
            last_change_timestamp: prev.last_change_timestamp,
            purged_from_version,
            purged_until_version,
        });

        return header;
    }
};

type EntityMetadata = (
    Pick<OutputRecord, "key" | "token" | "ttl"> & 
    { envelope: EntityEnvelope<Record<string, unknown>> }
);