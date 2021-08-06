import { positiveIntegerType, recordType, Type, TypeOf } from "paratype";
import { ActionOptions, ActionResultType } from "../action";
import { ChangeType } from "../change";
import { DomainDriver, FilterSpec, InputRecord, OutputRecord } from "../driver";
import { EntityProjection } from "../entity-projection";
import { EntityView } from "../entity-view";
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
import { _partitionKeys, _rowKeys } from "./data-keys";
import { _QueryImpl } from "./query-impl";
import { _DriverQuerySource, _QuerySource } from "./query-source";
import { _getMinSyncVersion, _materialViewKindType, _viewHeader, _ViewHeader } from "./view-header";

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

    #createEntityView = async <T extends Record<string, unknown>>(
        viewKey: string,
        definition: EntityProjection<T>,
        version: number,
        circular: readonly string[],
        authError?: ErrorFactory,
    ): Promise<EntityView> => {        
        const { kind, auth, dependencies } = definition;
        const envelope = entityEnvelopeType(definition.type);
        const transform = (record: OutputRecord): T => envelope.fromJsonValue(record.value).entity;
        const partitionKey = _partitionKeys.view(viewKey);
        const source = new _DriverQuerySource(
            this.#driver,
            this.#id,
            partitionKey,
            transform,
        );
        
        const where: readonly FilterSpec[] = Object.freeze([
            {
                path: ["value", "start"],
                operator: "<=",
                operand: version,
            },
            {
                path: ["value", "end"],
                operator: ">",
                operand: version,
            }
        ]);

        let query: Queryable<T> = new _QueryImpl(source, ["value", "entity"], where);

        if (authError && auth) {
            const snapshot = this.#createViewSnapshotFunc(version, dependencies, circular);
            const authed = await auth(query, this.#scope, snapshot);

            if (authed === Forbidden) {
                throw authError();
            }

            query = authed;
        }

        const get: EntityView<T>["get"] = key => query.where(definition.key, "==", key).first();
        const view: EntityView<T> = {
            ...query,
            get,
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
        const partitionKey = _partitionKeys.view(viewKey);
        const rowKey = _rowKeys.viewState(version);
        
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

        let fetched = false;
        let data: OutputRecord | undefined;
        const read: StateView<T>["read"] = async () => {
            if (!fetched) {
                data = await this.#driver.read(this.#id, partitionKey, rowKey);
                fetched = true;
            }

            if (!data) {
                throw new Error(`State not found: ${this.#id}/${partitionKey}/${rowKey}`);
            }

            const mapped = definition.type.fromJsonValue(data.value);
            const authed = await authMapper(mapped);

            return authed;
        };
        const view: StateView<T> = Object.freeze({ kind, version, read });
        return view;
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

    #getAllMaterialViews = (): string[] => Object
        .entries(this.#model.views)
        .filter(([,def]) => _materialViewKindType.test(def))
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
            const purged = info.purge_start_version <= first && info.purge_end_version >= first;
            if (notSynced || purged) {
                viewsToSync.add(key);
            }
            if (purged && (last === void(0) || last > info.purge_end_version)) {
                last = info.purge_end_version;
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

        const filter = Array.from(eventsToSync);
        let synced = 0;
        for await (const commit of this.#readCommits({ first, last, filter })) {
            await this.#syncCommit(commit, infoMap, viewsToSync);
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
                await this.#syncCommit(latest, infoMap, viewsToSync);
                synced = latest.version;
            }
        }

        return synced;
    }

    #syncCommit = async (commit: _Commit, infoMap: Map<string, SyncViewInfo>, keys: Set<string>): Promise<void> => {
        for (const key of keys) {
            const info = infoMap.get(key);
            const definition = this.#model.views[key];
            
            if (!info) {
                throw new Error("Invalid view info map");
            }
            
            if (definition?.kind === "entities") {
                await this.#syncEntities(commit, definition);
            } else if (definition?.kind === "state") {
                await this.#syncState(commit, definition);
            } else {
                throw new Error(`Don't know how to sync view: ${key}`);
            }

            throw new Error("TODO: store new view header");
        }
    }

    #syncEntities = async (commit: _Commit, definition: EntityProjection): Promise<void> => {
        const changes = _getChangesFromCommit(commit, this.#model.events, definition.mutators);
        throw new Error("TODO: syncEntities");
    }

    #syncState = async (commit: _Commit, definition: StateProjection): Promise<void> => {
        const changes = _getChangesFromCommit(commit, this.#model.events, definition.mutators);
        throw new Error("TODO: syncState");
    }

    #tryAction = async <K extends string & keyof Model["actions"]>(
        latest: _Commit | undefined,
        minBase: number,
        actionKey: K, 
        input: TypeOf<Model["actions"][K]["input"]>, 
        options: Partial<ActionOptions> = {},
    ): Promise<ActionResultType<Model, K> | undefined> => {
        const { dry = false, signal } = options;
        const base = latest?.version || 0;
        const timestamp = this.#driver.timestamp();
                
        if (base < minBase) {
            const status = "aborted";
            const message = "Optimistic concurrency inconsistency";
            return { timestamp, base, status, message };
        }

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

    #tryCommit = (commit: _Commit): Promise<boolean> => {
        const key = _rowKeys.commit(commit.version);
        const value = _commitType.toJsonValue(commit);

        if (value === void(0)) {
            throw new Error("Failed to serialize commit");
        }

        const input: InputRecord = {
            key,
            value,
            replace: null,
            ttl: -1,
        };

        return this.#driver.write(this.#id, _partitionKeys.commits, input);
    };

    do = async <K extends string & keyof Model["actions"]>(
        key: K, 
        input: TypeOf<Model["actions"][K]["input"]>, 
        options: Partial<ActionOptions> = {},
    ): Promise<ActionResultType<Model, K>> => {
        let minBase = 0;

        for (;;) {
            const latest = await this.#getLatestCommit();            
            const result = await this.#tryAction(latest, minBase, key, input, options);

            if (result !== void(0)) {
                return result;
            }

            minBase = (latest?.version || 0) + 1;
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
        const materialViewKeys = this.#getAllMaterialViews();
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
                purge_start_version: header?.purge_start_version || 0,
                purge_end_version: header?.purge_end_version || 0,
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
            this.#getAllMaterialViews();
        const infoMap = new Map<string, SyncViewInfo>(
            (await Promise.all(viewKeys.map(this.#getViewHeaderRecord))).map((record, index) => ([
                viewKeys[index],
                getSyncInfoFromRecord(record),
            ]))    
        );

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
        return synced;
    }

    purge = (options: Partial<PurgeOptions> = {}): Promise<PurgeResult> => {
        // When implementing: Remember to NOT COMPETE with sync!
        // Old versions may be needed (and recreated) when syncing a new view with
        // dependencies!
        throw new Error("TODO: purge not implemented.");
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

type EntityEnvelope<T> = {
    start: number;
    end: number;
    entity: T;
};

const entityEnvelopeType = <T>(valueType: Type<T>): Type<EntityEnvelope<T>> => recordType({
    start: positiveIntegerType,
    end: positiveIntegerType,
    entity: valueType,
});

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

type SyncViewInfo = {
    readonly update_token: string | null;
    readonly sync_version: number;
    readonly purge_start_version: number;
    readonly purge_end_version: number;
}

const getSyncInfoFromRecord = (record: OutputRecord | undefined): SyncViewInfo => {
    let sync_version = 0;
    let purge_start_version = 0;
    let purge_end_version = 0;
    let update_token: string | null = null;

    if (record) {
        const header = _viewHeader.fromJsonValue(record.value);
        sync_version = header.sync_version;
        purge_start_version = header.purge_start_version;
        purge_end_version = header.purge_end_version;
        update_token = record.token;
    }

    return Object.freeze({
        sync_version, 
        purge_start_version, 
        purge_end_version, 
        update_token
    });
};
