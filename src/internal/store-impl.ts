import { JsonValue, TypeOf } from "paratype";
import { ActionOptions, ActionResult, ActionResultType } from "../action";
import { ActionContext } from "../action-context";
import { Change, ChangeType } from "../change";
import { DomainDriver } from "../driver";
import { DomainModel } from "../model";
import { ViewOf } from "../projection";
import { DomainStore, DomainStoreStatus, ReadOptions, SyncOptions, ViewOptions } from "../store";
import { _Commit, _commitType } from "./commit";
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
            "commits",
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

    #tryCommit = async(commit: _Commit): Promise<boolean> => {
        throw new Error("TODO");
    }

    #tryRunAction = async <K extends string & keyof Model["actions"]>(
        latest: _Commit | undefined,
        minBase: number,
        actionKey: K, 
        input: TypeOf<Model["actions"][K]["input"]>, 
        options: Partial<ActionOptions> = {},
    ): Promise<ActionResultType<Model, K> | undefined> => {
        const { dry = false, signal } = options;
        const base = latest?.version || 0;
        const timestamp = this.#driver.timestamp();
        const emittedEvents: Omit<Change<JsonValue>, "version" | "timestamp" | "position">[] = [];
        const emittedChanges = new Set<string>();
        let message: ActionResult["message"];
        let status: ActionResult["status"] | undefined;
        let output: ActionResultType<Model, K>["output"];
                
        if (base < minBase) {
            status = "aborted";
            message = "Optimistic concurrency inconsistency";
            return { timestamp, base, status, message, output };
        }

        if (!(actionKey in this.#model.actions)) {
            status = "rejected";
            message = `Unknown action: ${actionKey}`;
            return { timestamp, base, status, message, output };
        }
        
        const handler = this.#model.actions[actionKey];
        const inputError = handler.input.error(input);
        
        if (inputError !== void(0)) {
            status = "rejected";
            message = `Invalid action input: ${inputError}`;
            return { timestamp, base, status, message, output };
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
        let active = true;
        
        const fail = (kind: typeof status) => (msg: string) => {
            if (active) {
                status = kind;
                message = msg;
            }
            throw new Error(msg || kind);
        };

        const context: ActionContext = {
            version,
            timestamp,
            input,
            scope: this.#scope,
            forbidden: fail("forbidden"),
            conflict: fail("conflict"),
            output: result => {
                if (!active || !handler.output) {
                    throw new Error("Output cannot be assigned");
                }
                const typeError = handler.output.error(result);
                if (typeError !== void(0)) {
                    throw new Error(`Invalid action output: ${typeError}`);
                }
                output = result as typeof output;
            },
            emit: (changeKey, arg) => {
                if (!(changeKey in this.#model.events)) {
                    throw new Error(`Cannot emit unknown event: ${changeKey}`);
                }

                const eventType = this.#model.events[changeKey];
                const typeError = eventType.error(arg);
                if (typeError !== void(0)) {
                    throw new Error(`Invalid argument for event '${changeKey}': ${typeError}`);
                }

                const jsonArg = eventType.toJsonValue(arg);
                if (jsonArg == void(0)) {
                    throw new Error(`Argument for event '${changeKey}' could not be converted to json`);
                }

                emittedChanges.add(changeKey);
                emittedEvents.push({
                    key: changeKey,
                    arg: jsonArg,
                });
            },
            view: viewKey => {
                if (!handler.dependencies.has(viewKey)) {
                    throw new Error(
                        `Cannot access view '${viewKey}' because it is ` + 
                        `not a dependency of action '${actionKey}'`
                    );
                }

                throw new Error("TODO: GET VIEW SNAPSHOT");
            }
        };

        try {
            await handler.exec(context);
            status = "success"; 
            active = false;
        } catch (e) {
            if (status === void(0) || status === "success") {
                status = "failed";
                message = e instanceof Error ? e.message : void(0);
            }
        }

        if (status !== "success") {
            return { timestamp, base, status, message, output };
        }

        if (signal?.aborted) {
            status = "aborted";
            message = "Signal aborted";
            return { timestamp, base, status, message, output };
        }
        
        if (dry) {
            return { timestamp, base, status, message, output, changes: emittedEvents.length };
        }

        const position = latest ? latest.position + latest.events.length : 1;
        const commit: _Commit = {
            version,
            position,
            timestamp,
            changes: Array.from(emittedChanges),
            events: emittedEvents,
        };

        if (!await this.#tryCommit(commit)) {
            return void(0);
        }

        return { timestamp, base, status, message, output, committed: version, changes: emittedEvents.length };
    }

    do = async <K extends string & keyof Model["actions"]>(
        key: K, 
        input: TypeOf<Model["actions"][K]["input"]>, 
        options: Partial<ActionOptions> = {},
    ): Promise<ActionResultType<Model, K>> => {
        let minBase = 0;

        for (;;) {
            const latest = await this.#getLatestCommit();            
            const result = await this.#tryRunAction(latest, minBase, key, input, options);

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
                    throw new Error("Detected inconsistent commit history sequence");
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
