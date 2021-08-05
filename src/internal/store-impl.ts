import { JsonValue, positiveIntegerType, recordType, Type, TypeOf } from "paratype";
import { ActionOptions, ActionResultType } from "../action";
import { Change, ChangeType } from "../change";
import { DomainDriver, FilterSpec, InputRecord, OutputRecord } from "../driver";
import { EntityProjection } from "../entity-projection";
import { EntityView } from "../entity-view";
import { DomainModel } from "../model";
import { ViewOf } from "../projection";
import { QueryHandler } from "../query-handler";
import { QueryView } from "../query-view";
import { StateProjection } from "../state-projection";
import { StateView } from "../state-view";
import { DomainStore, DomainStoreStatus, ErrorFactory, ReadOptions, SyncOptions, ViewOptions } from "../store";
import { _ActionContextImpl } from "./action-context-impl";
import { _Commit, _commitType } from "./commit";
import { _partitionKeys, _rowKeys } from "./data-keys";
import { _QueryImpl } from "./query-impl";
import { _DriverQuerySource, _QuerySource } from "./query-source";
import { _viewHeader, _ViewHeader } from "./view-header";

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
        authError: ErrorFactory | undefined,
    ): Promise<EntityView> => {        
        const { kind } = definition;
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

        const query = new _QueryImpl(source, ["value", "entity"], where);

        if (authError && definition.auth) {
            throw new Error("TODO: Apply auth to query!");
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
        authError: ErrorFactory | undefined,
    ): StateView => {
        const { kind } = definition;
        const partitionKey = _partitionKeys.view(viewKey);
        const rowKey = _rowKeys.viewState(version);
        
        const auth = async (state: T): Promise<T> => {
            if (!authError || !definition.auth) {
                return state;
            }

            throw new Error("TODO: IMPLEMENT STATE VIEW AUTH");
        };

        let fetched = false;
        let data: OutputRecord | undefined;
        const read: StateView["read"] = async () => {
            if (!fetched) {
                data = await this.#driver.read(this.#id, partitionKey, rowKey);
                fetched = true;
            }

            if (!data) {
                throw new Error(`State not found: ${this.#id}/${partitionKey}/${rowKey}`);
            }

            const mapped = definition.type.fromJsonValue(data.value);
            const authed = await auth(mapped);

            return authed;
        };
        const view: StateView = Object.freeze({ kind, version, read });
        return view;
    }

    #createQueryView = (
        viewKey: string,
        definition: QueryHandler,
        version: number,
        authError: ErrorFactory | undefined,
    ): QueryView => {
        throw new Error("TODO: IMPLEMENT");
    }    

    #deserializeChangeArg = (
        key: string, 
        arg: JsonValue
    ): unknown => {
        if (key in this.#model.events) {
            return this.#model.events[key].fromJsonValue(arg);
        } else {
            return arg;
        }
    }

    #getLatestCommit = (): Promise<_Commit | undefined> => (
        new _QueryImpl(this.#commitSource, ["value"]).by("version", "descending").first()
    )

    #getViewHeaderRecord = (key: string): Promise<OutputRecord | undefined> => {
        const partition = _partitionKeys.view(key);
        const row = _rowKeys.viewHeader;
        return this.#driver.read(this.#id, partition, row);
    }

    #getViewHeader = async (key: string): Promise<_ViewHeader | undefined> => {
        const record = await this.#getViewHeaderRecord(key);
        return record && _viewHeader.fromJsonValue(record.value);
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
        const fromContext = await new _ActionContextImpl(
            version,
            timestamp,
            input,
            this.#scope,
            this.#model.events,
            handler,
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
        const { first, last, changes } = options;
        const deserializeChangeArg = this.#deserializeChangeArg;
        
        let query = new _QueryImpl(this.#commitSource, ["value"]).by("version");
        let minVersion = 1;
        let minPosition = 1;

        if (typeof first === "number") {
            query = query.where("version", ">=", first);
            minVersion = first;
        }

        if (typeof last === "number") {
            query = query.where("version", "<=", last);
        }

        if (Array.isArray(changes)) {
            query = query.where("changes", "includes-any", changes);
        }

        return {[Symbol.asyncIterator]: async function*() {
            for await (const commit of query.all()) {
                const { timestamp, version } = commit;
                let { position } = commit;

                if (version < minVersion || position < minPosition) {
                    throw new Error("Detected inconsistent commit history");
                }

                for (const entry of commit.events) {
                    const { key, arg, ...rest } = entry;
                    const change: Change = {
                        ...rest,
                        key: key,
                        timestamp, 
                        version, 
                        position,
                        arg: deserializeChangeArg(key, arg),
                    };

                    yield change as ChangeType<Model["events"]>;
                    ++position;
                }

                minVersion = version + 1;
                minPosition = position;
            }
        }};
    }

    stat = async (): Promise<DomainStoreStatus<string & keyof Model["views"]>> => {
        throw new Error("TODO: Method not implemented.");
    }

    sync = (options: Partial<SyncOptions> = {}): Promise<number> => {
        throw new Error("TODO: Method not implemented.");
    }

    view = async <K extends string & keyof Model["views"]>(
        key: K, 
        options: Partial<ViewOptions> = {}
    ): Promise<ViewOf<Model["views"][K]> | undefined> => {
        const { sync = 0, signal, auth } = options;
        const definition = this.#model.views[key];
        if (!definition) {
            return void(0);
        }

        const header = await this.#getViewHeader(key);
        if (header && header.kind !== definition.kind) {
            return void(0);
        }

        let version = header?.sync || 0;
        if (sync > version) {
            version = await this.sync({ views: [key], target: sync, signal });
            
            if (sync > version) {
                return void(0);
            }
        }

        const authError: ErrorFactory | undefined = (
            typeof auth === "function" ? auth :
                auth === true ? () => new Error("Forbidden") :
                    void(0)
        );

        switch (definition.kind) {
            case "entities":
                return await this.#createEntityView(key, definition, version, authError) as ViewOf<Model["views"][K]>;
            case "state":
                return this.#createStateView(key, definition, version, authError) as ViewOf<Model["views"][K]>;
            case "query":
                return this.#createQueryView(key, definition, version, authError) as ViewOf<Model["views"][K]>;
            default:
                return void(0);
        }
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
