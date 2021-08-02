import { TypeOf } from "paratype";
import { ActionOptions, ActionResultType } from "./action";
import { ChangeType } from "./change";
import { DomainModel } from "./model";
import { ViewOf } from "./projection";
import { SortedQueryable } from "./queryable";

export interface DomainStore<Model extends DomainModel> {
    readonly changes: SortedQueryable<ChangeType<Model["events"]>>;
    do<K extends string & keyof Model["actions"]>(
        key: K,
        input: TypeOf<Model["actions"][K]["input"]>,
        options?: ActionOptions,
    ): Promise<ActionResultType<Model, K>>;
    stat(): Promise<DomainStoreStatus<string & keyof Model["views"]>>;
    sync(): Promise<DomainStoreStatus<string & keyof Model["views"]>>;
    view<K extends string & keyof Model["views"]>(
        key: K,
        options?: ViewOptions
    ): Promise<ViewOf<Model["views"][K]> | undefined>;
}

export interface DomainStoreStatus<K extends string> {
    readonly version: number;
    readonly views: Readonly<Record<K, ViewStatus>>;
}

export interface ViewStatus {
    readonly sync: number;
}

export interface ViewOptions {
    readonly sync: number;
}
