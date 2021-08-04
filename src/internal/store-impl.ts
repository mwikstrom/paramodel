import { TypeOf } from "paratype";
import { ActionOptions, ActionResultType } from "../action";
import { ChangeType } from "../change";
import { DomainDriver } from "../driver";
import { DomainModel } from "../model";
import { ViewOf } from "../projection";
import { DomainStore, DomainStoreStatus, ReadOptions, SyncOptions, ViewOptions } from "../store";

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

    do = <K extends string & keyof Model["actions"]>(
        key: K, 
        input: TypeOf<Model["actions"][K]["input"]>, 
        options?: Partial<ActionOptions>
    ): Promise<ActionResultType<Model, K>> => {
        throw new Error("TODO: Method not implemented.");
    }

    read = (
        options?: Partial<ReadOptions<string & keyof Model["events"]>>
    ): AsyncIterable<ChangeType<Model["events"]>> => {
        throw new Error("TODO: Method not implemented.");
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
