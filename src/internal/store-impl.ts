import { TypeOf } from "paratype";
import { ActionOptions, ActionResultType } from "../action";
import { ChangeType } from "../change";
import { DomainDriver } from "../driver";
import { DomainModel } from "../model";
import { ViewOf } from "../projection";
import { SortedQueryable } from "../queryable";
import { DomainStore, DomainStoreStatus, ViewOptions } from "../store";

/** @internal */
export class _StoreImpl<Model extends DomainModel> implements DomainStore<Model> {
    #driver: DomainDriver;
    #id: string;
    #model: Model;
    #scope: TypeOf<Model["scope"]>;

    constructor(driver: DomainDriver, id: string, model: Model, scope: TypeOf<Model["scope"]>) {
        this.#driver = driver;
        this.#id = id;
        this.#model = model;
        this.#scope = scope;
    }

    do = <K extends string & keyof Model["actions"]>(
        key: K, 
        input: TypeOf<Model["actions"][K]["input"]>, 
        options?: ActionOptions
    ): Promise<ActionResultType<Model, K>> => {
        throw new Error("TODO: Method not implemented.");
    }

    read = (): SortedQueryable<ChangeType<Model["events"]>> => {
        throw new Error("TODO: Method not implemented.");
    }

    stat = (): Promise<DomainStoreStatus<string & keyof Model["views"]>> => {
        throw new Error("TODO: Method not implemented.");
    }

    sync(): Promise<DomainStoreStatus<string & keyof Model["views"]>> {
        throw new Error("TODO: Method not implemented.");
    }

    view = <K extends string & keyof Model["views"]>(
        key: K, 
        options?: ViewOptions
    ): Promise<ViewOf<Model["views"][K]> | undefined> => {
        throw new Error("TODO: Method not implemented.");
    }
}
