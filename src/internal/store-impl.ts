import deepEqual from "deep-equal";
import { 
    JsonValue, 
    jsonValueType, 
    nonNegativeIntegerType, 
    positiveIntegerType, 
    recordType, 
    Type, 
    TypeOf
} from "paratype";
import { ActionResultType } from "../action-result";
import { ActionOptions } from "../action-options";
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
import { 
    _getMinSyncVersion, 
    _getSyncInfoFromRecord, 
    _getViewHeaderRecordForCommit, 
    _getViewHeaderRecordForPurge, 
    _MaterialViewKind, 
    _materialViewKindType, 
    _SyncViewInfo, 
    _viewHeader, 
    _ViewHeader 
} from "./view-header";
import { Disclosed, PiiString, piiStringType, _createPiiString } from "../pii";
import { ActionContext } from "../action-context";
import { 
    _createPiiKey, 
    _decryptPii, 
    _encryptPii, 
    _PiiKey, 
    _piiKeyType, 
    _PiiStringAuthData
} from "./pii-crypto";
import { EntityMapping } from "../entity-mapping";

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
            _partitionKeys.history,
            record => _commitType.fromJsonValue(record.value)
        );
    }

    #getPiiKey = async (scope: string): Promise<_PiiKey | undefined> => {
        const output = await this.#getPiiKeyRecord(scope);
        if (output) {
            return _piiKeyType.fromJsonValue(output.value);
        }
    }

    #getPiiKeyRecord = async (scope: string): Promise<OutputRecord | undefined> => (
        this.#driver.read(this.#id, _partitionKeys.pii, _rowKeys.piiScope(scope))
    );

    #getPiiSyncVersion = async (): Promise<number> => {
        const output = await this.#driver.read(this.#id, _partitionKeys.pii, _rowKeys.piiSync);
        if (!output) {
            return 0;
        }
        return nonNegativeIntegerType.fromJsonValue(output.value);
    };

    #getOrCreatePiiKey = async (scope: string, version: number): Promise<_PiiKey> => {
        for (;;) {
            const output = await this.#getPiiKeyRecord(scope);
            if (output) {
                const sync = await this.#getPiiSyncVersion();
                const shredded = await this
                    .#getCommitQuery({ first: sync, excludeFirst: true})
                    .where("shredded", "includes", scope)
                    .any();
                if (!shredded) {
                    return _piiKeyType.fromJsonValue(output.value);
                }
            }

            const data = _createPiiKey(version);
            const input: InputRecord = {
                key: _rowKeys.piiScope(scope),
                value: _piiKeyType.toJsonValue(data),
                replace: output?.token || null,
                ttl: -1,
            };

            if (await this.#driver.write(this.#id, _partitionKeys.pii, input)) {
                return data;
            }
        }
    }

    #createPii = async (
        scope: string,
        version: number,
        value: string,
        obfuscated = ""
    ): Promise<PiiString> => {
        const key = await this.#getOrCreatePiiKey(scope, version);
        const auth: _PiiStringAuthData = {
            obf: obfuscated,
            scp: scope,
            ver: version,
        };
        const data = _encryptPii(key, value, auth);
        return _createPiiString(data);
    }

    #discloseString = async (pii: PiiString): Promise<string> => {  
        const data = pii._getData();
        const key = await this.#getPiiKey(data.scp);
        let result = data.obf;
        if (key && key.ver <= data.ver) {
            const plain = _decryptPii(key, data);
            if (typeof plain === "string") {
                result = plain;
            }
        }                
        return result;
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
        projection: EntityProjection<T> | EntityMapping<T>,
        version: number,
        circular: readonly string[],
        authError?: ErrorFactory,
        metaMap?: WeakMap<T, EntityMetadata>,
    ): Promise<ReadonlyEntityCollection<T>> => {        
        const { auth, dependencies } = projection;
        let query = this.#createEntityQueryable(viewKey, projection.type, version, "valid_range", metaMap);

        if (authError && auth) {
            const snapshot = this.#createViewSnapshotFunc(version, dependencies, circular);
            const authed = await auth(query, this.#scope, snapshot);

            if (authed === Forbidden) {
                throw authError();
            }

            query = authed;
        }

        const get: EntityView<T>["get"] = key => query.where(projection.key, "==", key).first();
        const collection: ReadonlyEntityCollection<T> = {
            ...query,
            get,
        };

        return collection;
    }

    #createEntityView = async <T extends Record<string, unknown>>(
        viewKey: string,
        projection: EntityProjection<T> | EntityMapping<T>,
        version: number,
        circular: readonly string[],
        authError?: ErrorFactory,
    ): Promise<EntityView> => {        
        const { kind,  } = projection;
        const collection = await this.#createReadonlyEntityCollection(
            viewKey, 
            projection, 
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
        projection: StateProjection<T>,
        version: number,
        circular: readonly string[],
        authError?: ErrorFactory,
    ): StateView<T> => {
        const { kind, dependencies, auth } = projection;       
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
                return await authMapper(projection.initial);
            }

            const mapped = await this.#fetchStateSnapshot(viewKey, projection.type, version);
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
        handler: QueryHandler<P, T>,
        version: number,
        circular: readonly string[],
        authError?: ErrorFactory,
    ): QueryView<P, T> => {
        const { kind, exec, auth, dependencies } = handler;
        const snapshot = this.#createViewSnapshotFunc(version, dependencies, circular);
        const query: QueryView<P, T>["query"] = (
            authError && auth ? async params => {
                const result = await auth(exec, snapshot, params, this.#scope);
                if (result === Forbidden) {
                    throw authError();
                }
                return result;    
            } : params => exec(snapshot, params, this.#scope, this.disclose)
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
        const projection = this.#model.views[viewKey];
        
        if (!projection) {
            throw new Error(`Cannot access unknown view: ${viewKey}`);
        }

        const view = await this.#createViewFromProjection(projection, viewKey, version, circular, authError);
        if (!view) {
            throw new Error(`Unable to create view accessor: ${viewKey}`);
        }   
        
        return view;
    }

    #createViewFromProjection = async <Definition extends AnyProjection>(
        projection: Definition,
        viewKey: string,
        version: number,
        circular: readonly string[],
        authError?: ErrorFactory,
    ): Promise<ViewOf<Definition> | undefined> => {
        switch (projection.kind) {
            case "entities":
            case "mapped-entities":
                return await this.#createEntityView(
                    viewKey, 
                    projection, 
                    version, 
                    circular,
                    authError,
                ) as ViewOf<Definition>;
            case "state":
                return this.#createStateView(
                    viewKey, 
                    projection, 
                    version, 
                    circular,
                    authError,
                ) as ViewOf<Definition>;
            case "query":
                return this.#createQueryView(
                    projection,
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

        // TODO: Verify whether disclosing view is allowed

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
        const record = await this.#driver.read(this.#id, _partitionKeys.history, _rowKeys.commit(version));
        if (record) {
            return _commitType.fromJsonValue(record.value);
        }
    }

    #getSyncInfoMap = async (
        viewKeys: readonly string[]
    ): Promise<Map<string, _SyncViewInfo>> => new Map<string, _SyncViewInfo>(
        (await Promise.all(viewKeys.map(this.#getViewHeaderRecord))).map((record, index) => ([
            viewKeys[index],
            _getSyncInfoFromRecord(record),
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
            
            const projection = this.#model.views[next];
            if (!projection) {
                continue;
            }

            if (_materialViewKindType.test(projection.kind)) {
                result.push(next);
            }

            for (const dependency of projection.dependencies) {
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
        infoMap: Map<string, _SyncViewInfo>,
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
            const projection = this.#model.views[key];
            if (projection?.kind === "state" || projection?.kind === "entities") {
                projection.mutators.forEach(e => eventsToSync.add(e));
            } else { // TODO: Support syncing mapped entities
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

    #syncCommit = async (commit: _Commit, infoMap: Map<string, _SyncViewInfo>, keys: Set<string>): Promise<boolean> => {
        for (const key of keys) {
            const info = infoMap.get(key);
            const projection = this.#model.views[key];
            
            if (!info) {
                throw new Error("Invalid view info map");
            }
            
            let modified: boolean;

            if (projection?.kind === "entities") {
                modified = await this.#syncEntities(commit, projection, key);
            } else if (projection?.kind === "state") {
                modified = await this.#syncState(commit, projection, key);
            } else { // TODO: Support syncing mapped entities
                throw new Error(`Don't know how to sync view: ${key}`);
            }

            const newInfo = await this.#storeViewHeaderForCommit(commit, key, projection.kind, info, modified);
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

    #syncEntities = async (commit: _Commit, projection: EntityProjection, viewKey: string): Promise<boolean> => {
        const changes = _getChangesFromCommit(commit, this.#model.events, projection.mutators);
        const snapshot = this.#createViewSnapshotFunc(commit.version, projection.dependencies, [viewKey]);
        const metaMap = new WeakMap<Record<string, unknown>, EntityMetadata>();
        const baseVerison = commit.version - 1;
        const base = await this.#createReadonlyEntityCollection(
            viewKey,
            projection,
            baseVerison,
            [viewKey],
            undefined,
            metaMap,
        );

        const pk = _partitionKeys.view(viewKey);
        const rk = (key: string): string => _rowKeys.entity(key, commit.version);
        const envelopeType = entityEnvelopeType(projection.type);
        const written = new Map<string, Record<string, unknown> | null>();
        const put: EntityProjectionState["put"] = props => void(written.set(props[projection.key] as string, props));
        const del: EntityProjectionState["del"] = key => void(written.set(key as string, null));
        const state: EntityProjectionState = {
            base,
            put,
            del,            
        };

        for (const change of changes) {
            await projection.apply(change, state, snapshot);
        }

        const validUntilBase = this.#createEntityQueryable(viewKey, projection.type, baseVerison, "valid_until");
        const alreadyMarkedWithValidUntil = new Set<string>();
        for await (const entity of validUntilBase.all()) {
            const key = entity[projection.key] as string;
            if (!written.has(key)) {
                throw new Error(
                    `Detected non-deterministic entity projection of view "${viewKey}". ` + 
                    `Entity "${key}" was marked as valid until ${baseVerison} in an earlier sync ` +
                    `but was not written now for commit ${commit.version}.`
                );
            }
            alreadyMarkedWithValidUntil.add(key);
        }

        const validFromCommit = this.#createEntityQueryable(viewKey, projection.type, commit.version, "valid_from");
        const alreadyWritten = new Set<string>();
        for await (const entity of validFromCommit.all()) {
            const key = entity[projection.key] as string;
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
                projection.key, 
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

    #syncState = async (commit: _Commit, projection: StateProjection, key: string): Promise<boolean> => {
        const changes = _getChangesFromCommit(commit, this.#model.events, projection.mutators);
        const snapshot = this.#createViewSnapshotFunc(commit.version, projection.dependencies, [key]);
        const before = commit.version === 1 ?
            projection.initial :
            await this.#createStateView(key, projection, commit.version - 1, [key]).read();
        let after = before;      
        for (const change of changes) {
            after = await projection.apply(change, after, snapshot);
        }
        
        const jsonState = projection.type.toJsonValue(
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
        prev: _SyncViewInfo,
        modified: boolean
    ): Promise<_SyncViewInfo | undefined> => this.#storeViewHeader(
        key, 
        prev, 
        info => _getViewHeaderRecordForCommit(commit, info, kind, modified)
    );

    #storeViewHeaderForPurge = async (
        key: string,
        purgeVersion: number,
        prev: _SyncViewInfo,
    ): Promise<_SyncViewInfo | undefined> => {
        const projection = this.#model.views[key];
        if (!projection) {
            return void(0);
        }

        const { kind } = projection;
        if (!_materialViewKindType.test(kind)) {
            return void(0);
        }

        return await this.#storeViewHeader(
            key, 
            prev, 
            info => _getViewHeaderRecordForPurge(purgeVersion, info, kind)
        );
    }

    #storeViewHeader = async (
        key: string, 
        prev: _SyncViewInfo, 
        update: (info: _SyncViewInfo) => InputRecord | undefined
    ): Promise<_SyncViewInfo | undefined> => {
        const pk = _partitionKeys.view(key);
        for (;;) {
            const input = update(prev);
            if (!input) {
                return void(0);
            }
            
            let output = await this.#driver.write(this.#id, pk, input);

            if (output) {
                return _getSyncInfoFromRecord(output);
            }

            // Update token mismatch. Read current header and try again (loop continues)
            output = await this.#driver.read(this.#id, pk, input.key);
            prev = _getSyncInfoFromRecord(output);
        }
    }

    #expirePurgedViewData = async (
        key: string,
        info: _SyncViewInfo,
        signal?: AbortSignal
    ): Promise<boolean> => {
        if (info.purged_from_version !== 0) {
            return false;
        }

        if (info.purged_until_version === 0) {
            return true;
        }

        const projection = this.#model.views[key];
        if (!projection) {
            return false;
        }

        const { kind } = projection;
        if (!_materialViewKindType.test(kind)) {
            return false;
        }

        if (kind === "entities") {
            return await this.#expirePurgedEntities(key, info.purged_until_version, signal);
        } else if (kind === "state") {
            return await this.#expirePurgedState(key, info.purged_until_version, signal);
        } else { // TODO: Support purging mapped entities
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
        options: ActionOptions = {},
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
        const createPii: ActionContext["pii"] = (scope, ...rest) => this.#createPii(scope, version, ...rest);
        const fromContext = await new _ActionContextImpl(
            version,
            timestamp,
            input,
            this.#scope,
            this.#model.events,
            handler,
            snapshot,
            createPii,
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
            const { changes, events, shredded } = fromContext;
            const commit: _Commit = {
                version,
                position,
                timestamp,
                changes,
                events,
                shredded,
            };

            if (!await this.#tryCommit(commit)) {
                return void(0);
            }

            _logInfo(
                "Committed version %d in \"%s\": %s", 
                version, 
                this.#id,
                changes.length > 0 ? changes.join(", ") : "(no changes)"
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

        const output = await this.#driver.write(this.#id, _partitionKeys.history, input);
        return !!output;
    };

    do = async <K extends string & keyof Model["actions"]>(
        key: K, 
        input: TypeOf<Model["actions"][K]["input"]>, 
        options: ActionOptions = {},
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

    disclose = async <T>(value: T): Promise<Disclosed<T>> => {
        if (piiStringType.test(value)) {
            const mapped = await this.#discloseString(value);
            return mapped as Disclosed<T>;
        }

        if (Array.isArray(value)) {
            const mapped = new Array<unknown>();
            for (const item of value) {
                mapped.push(await this.disclose(item));
            }
            return mapped as Disclosed<T>;
        }

        if (value !== null && typeof value === "object") {
            const mapped = new Map();
            for (const key in value) {
                mapped.set(key, await this.disclose(value[key]));
            }
            return Object.fromEntries(mapped);
        }

        return value as Disclosed<T>;
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
        const projection = this.#model.views[key];
        let version = await this.#getViewSyncVersion(key, projection);
        
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
        const view = await this.#createViewFromProjection(projection, key, version, [key], authError);
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

type EntityMetadata = (
    Pick<OutputRecord, "key" | "token" | "ttl"> & 
    { envelope: EntityEnvelope<Record<string, unknown>> }
);