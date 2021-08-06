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
        options?: Partial<ActionOptions>,
    ): Promise<ActionResultType<Model, K>>;
    read(
        this: void, 
        options?: Partial<ReadOptions<string & keyof Model["events"]>>,
    ): AsyncIterable<ChangeType<Model["events"]>>;
    stat(this: void): Promise<DomainStoreStatus>;
    sync<K extends string & keyof Model["views"]>(
        this: void,
        options?: Partial<SyncOptions<K>>
    ): Promise<number>;
    purge(this: void, options?: Partial<PurgeOptions>): Promise<PurgeResult>;
    view<K extends string & keyof Model["views"]>(
        this: void,
        key: K,
        options?: Partial<ViewOptions>,
    ): Promise<ViewOf<Model["views"][K]> | undefined>;
}

export interface ReadOptions<K extends string> {
    readonly first: number;
    readonly last: number;
    readonly excludeFirst: boolean;
    readonly excludeLast: boolean;
    readonly filter: readonly K[];
}

export interface DomainStoreStatus {
    readonly version: number;
    readonly position: number;
    readonly timestamp?: Date;
    readonly views: Readonly<Record<string, ViewStatus>>;
}

export interface ViewStatus {
    readonly sync_version: number;
    readonly sync_position: number;
    readonly sync_timestamp?: Date;
    readonly last_change_version: number;
    readonly last_change_timestamp?: Date;
    readonly purge_start_version: number;
    readonly purge_end_version: number;
}

export interface ViewOptions {
    readonly sync: number;
    readonly signal: AbortSignal;
    readonly auth: boolean | ErrorFactory;
}

export interface SyncOptions<K extends string = string> {
    readonly target: number;
    readonly views: readonly K[];
    readonly signal: AbortSignal;
}

export interface PurgeOptions {
    readonly signal: AbortSignal;
}

export interface PurgeResult {
    readonly done: boolean;
}

export type ErrorFactory = () => Error;