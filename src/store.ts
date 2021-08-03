import { TypeOf } from "paratype";
import { ActionOptions, ActionResultType } from "./action";
import { ChangeType } from "./change";
import { DomainModel } from "./model";
import { ViewOf } from "./projection";
import { SortedQueryable } from "./queryable";

export interface DomainStore<Model extends DomainModel> {
    do<K extends string & keyof Model["actions"]>(
        this: void,
        key: K,
        input: TypeOf<Model["actions"][K]["input"]>,
        options?: ActionOptions,
    ): Promise<ActionResultType<Model, K>>;
    read(this: void): SortedQueryable<ChangeType<Model["events"]>>;
    stat(this: void): Promise<DomainStoreStatus<string & keyof Model["views"]>>;
    sync(this: void): Promise<DomainStoreStatus<string & keyof Model["views"]>>;
    view<K extends string & keyof Model["views"]>(
        this: void,
        key: K,
        options?: ViewOptions
    ): Promise<ViewOf<Model["views"][K]> | undefined>;
}

export interface DomainStoreStatus<K extends string> {
    readonly version: number;
    readonly position: number;
    readonly timestamp: Date;
    readonly views: Readonly<Record<K, ViewStatus>>;
}

export interface ViewStatus {
    readonly version: number;
    readonly position: number;
    readonly timestamp: Date;
    readonly clean: boolean;
    readonly failed: boolean;
}

export interface ViewOptions {
    readonly version: number;
}
