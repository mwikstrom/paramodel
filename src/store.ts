import { TypeOf } from "paratype";
import { ActionOptions, ActionResultType } from "./action";
import { ChangeType } from "./change";
import { DomainModel } from "./model";
import { ViewOf } from "./projection";

export interface DomainStore<Model extends DomainModel> {
    do<K extends string & keyof Model["actions"]>(
        this: void,
        key: K,
        input: TypeOf<Model["actions"][K]["input"]>,
        options?: ActionOptions,
    ): Promise<ActionResultType<Model, K>>;
    read(
        this: void, 
        options?: Partial<ReadOptions<string & keyof Model["events"]>>,
    ): AsyncIterable<ChangeType<Model["events"]>>;
    stat(this: void): Promise<DomainStoreStatus<string & keyof Model["views"]>>;
    sync<K extends string & keyof Model["views"]>(
        this: void,
        options?: SyncOptions<K>
    ): Promise<number>;
    view<K extends string & keyof Model["views"]>(
        this: void,
        key: K,
        options?: Partial<ViewOptions>,
    ): Promise<ViewOf<Model["views"][K]> | undefined>;
}

export interface ReadOptions<K extends string> {
    readonly start: number;
    readonly end: number;
    readonly changes: readonly K[];
    readonly signal: AbortSignal;
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
    readonly failed: boolean;
}

export interface ViewOptions {
    readonly sync: number;
    readonly signal: AbortSignal;
}

export interface SyncOptions<K extends string = string> {
    readonly target: number;
    readonly view: K;
    readonly signal: AbortSignal;
}
