import { JsonValue, TypeOf } from "paratype";
import { ActionOptions, ActionResultType } from "../action";
import { Change, ChangeType } from "../change";
import { DomainDriver } from "../driver";
import { DomainModel } from "../model";
import { ViewOf } from "../projection";
import { DomainStore, DomainStoreStatus, ReadOptions, SyncOptions, ViewOptions } from "../store";
import { _commitType } from "./commit";
import { _QueryImpl } from "./query-impl";
import { _DriverQuerySource } from "./query-source";

/** @internal */
export class _StoreImpl<Model extends DomainModel> implements DomainStore<Model> {
    readonly #driver: DomainDriver;
    readonly #id: string;
    readonly #model: Model;
    readonly #scope: TypeOf<Model["scope"]>;

    constructor(driver: DomainDriver, id: string, model: Model, scope: TypeOf<Model["scope"]>) {
        this.#driver = driver;
        this.#id = id;
        this.#model = model;
        this.#scope = scope;
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

    do = <K extends string & keyof Model["actions"]>(
        key: K, 
        input: TypeOf<Model["actions"][K]["input"]>, 
        options?: Partial<ActionOptions>
    ): Promise<ActionResultType<Model, K>> => {
        throw new Error("TODO: Method not implemented.");
    }

    read = (
        options: Partial<ReadOptions<string & keyof Model["events"]>> = {}
    ): AsyncIterable<ChangeType<Model["events"]>> => {
        const { first, last, changes } = options;
        const deserializeChangeArg = this.#deserializeChangeArg;
        const source = new _DriverQuerySource(
            this.#driver,
            this.#id,
            "commits",
            record => _commitType.fromJsonValue(record.value)
        );
        
        let query = new _QueryImpl(source, ["value"]).by("version");
        let minVersion = 1;

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

                if (version < minVersion) {
                    throw new Error("Detected inconsistent version sequence in commit history");
                }

                for (const entry of commit.events) {
                    const { key, arg, ...rest } = entry;
                    const change: Change = {
                        ...rest,
                        key: key,
                        timestamp, 
                        version, 
                        arg: deserializeChangeArg(key, arg),
                    };
                    yield change as ChangeType<Model["events"]>;
                }
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
            const done = await this.sync({ view: key, target: sync, signal });
            if (done < sync) {
                return void(0);
            }
        }

        throw new Error("TODO: Method not implemented.");
    }
}
