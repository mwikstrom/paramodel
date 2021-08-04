import { JsonValue, TypeOf } from "paratype";
import { ActionOptions, ActionResultType } from "../action";
import { Change, ChangeType } from "../change";
import { DomainDriver, InputRecord } from "../driver";
import { DomainModel } from "../model";
import { ViewOf } from "../projection";
import { DomainStore, DomainStoreStatus, ReadOptions, SyncOptions, ViewOptions } from "../store";
import { _ActionContextImpl } from "./action-context-impl";
import { _Commit, _commitType } from "./commit";
import { _partitionKeys } from "./partition-keys";
import { _QueryImpl } from "./query-impl";
import { _DriverQuerySource, _QuerySource } from "./query-source";

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
        const key = commit.version.toString(10).padStart(16, "0");
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

    stat = (): Promise<DomainStoreStatus<string & keyof Model["views"]>> => {
        throw new Error("TODO: Method not implemented.");
    }

    sync = (options: Partial<SyncOptions> = {}): Promise<number> => {
        throw new Error("TODO: Method not implemented.");
    }

    view = async <K extends string & keyof Model["views"]>(
        key: K, 
        options: Partial<ViewOptions> = {}
    ): Promise<ViewOf<Model["views"][K]> | undefined> => {
        const { sync, signal } = options;

        if (typeof sync === "number") {
            const done = await this.sync({ views: [key], target: sync, signal });
            if (done < sync) {
                return void(0);
            }
        }

        throw new Error("TODO: Method not implemented.");
    }
}
