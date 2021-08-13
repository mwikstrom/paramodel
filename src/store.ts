import { TypeOf } from "paratype";
import { ActionResultType } from "./action-result";
import { ActionOptions } from "./action-options";
import { ChangeType } from "./change";
import { DomainModel } from "./model";
import { ViewOf } from "./projection";
import { Disclosed } from "./pii";

/**
 * A domain store
 * @public
 */
export interface DomainStore<Model extends DomainModel> {
    /**
     * Executes an action
     * @param this - <i>(Ignored)</i> This function uses implicit `this` binding
     * @param key - Key of the action to execute
     * @param input - Action input
     * @param options - <i>(Optional)</i> Execution options
     */
    do<K extends string & keyof Model["actions"]>(
        this: void,
        key: K,
        input: TypeOf<Model["actions"][K]["input"]>,
        options?: ActionOptions,
    ): Promise<ActionResultType<Model, K>>;

    /**
     * Processes the specified value recursively by replacing any {@link PiiString} with
     * the underlying decrypted or obfuscated value.
     * @param this - <i>(Ignored)</i> This function uses implicit `this` binding
     * @param value - The value from which PII shall be disclosed
     */
    disclose<T>(this: void, value: T): Promise<Disclosed<T>>;

    /**
     * Reads change history
     * @param this - <i>(Ignored)</i> This function uses implicit `this` binding
     * @param options - <i>(Optional)</i> Read options
     */
    read(
        this: void, 
        options?: Partial<ReadOptions<string & keyof Model["events"]>>,
    ): AsyncIterable<ChangeType<Model["events"]>>;

    /**
     * Returns status of the current store
     * @param this - <i>(Ignored)</i> This function uses implicit `this` binding
     */
    stat(this: void): Promise<DomainStoreStatus>;

    /**
     * Synchronizes the views of the current store
     * @param this - <i>(Ignored)</i> This function uses implicit `this` binding
     * @param options - <i>(Optional)</i> Synchronization options
     */
    sync<K extends string & keyof Model["views"]>(
        this: void,
        options?: Partial<SyncOptions<K>>
    ): Promise<number>;

    /**
     * Purges the views of the current store
     * 
     * @param this - <i>(Ignored)</i> This function uses implicit `this` binding
     * @param options - <i>(Optional)</i> Purge options
     * 
     * @returns A promise that resolves with a boolean value indicating whether
     * the purge operation ran to completion. 
     * 
     * When it resolves to `false` the purge operation should be run again until it 
     * eventually completes.
     */
    purge(this: void, options?: Partial<PurgeOptions>): Promise<boolean>;
    
    /**
     * Gets a view snapshot
     * @param this - <i>(Ignored)</i> This function uses implicit `this` binding
     * @param key - Key of the view to get
     * @param options - <i>(Optional)</i> View options
     */
    view<K extends string & keyof Model["views"]>(
        this: void,
        key: K,
        options?: Partial<ViewOptions>,
    ): Promise<ViewOf<Model["views"][K]> | undefined>;
}

/**
 * Options for reading change history
 * @public
 */
export interface ReadOptions<K extends string> {
    /** The first version number to read */
    readonly first: number;

    /** The last version number to read */
    readonly last: number;

    /** When `true`, reading starts after the specified first version number */
    readonly excludeFirst: boolean;

    /** When `false`, reading stops before the last version number */
    readonly excludeLast: boolean;

    /** An optional array of change event keys that shall be read */
    readonly filter: readonly K[];
}

/**
 * Status of a {@link DomainStore}
 * @public
 */
export interface DomainStoreStatus {
    /** The latest comitted version number */
    readonly version: number;

    /** The total number of committed change events */
    readonly position: number;

    /** Timestamp of the latest commit, or `undefined` when change history is empty */
    readonly timestamp?: Date;

    /** Status for each defined view */
    readonly views: Readonly<Record<string, MaterializedViewStatus>>;
}

/**
 * Status for a materialized view
 * @public
 */
export interface MaterializedViewStatus {
    /** Specifies whether the view is active (included in the model) */
    readonly active: boolean;

    /** Specifies the kind of materialized view */
    readonly kind: string;

    /** The commit version number that the view is synchronized with */
    readonly sync_version: number;

    /** The total number of change events that the view is synchronized with */
    readonly sync_position: number;

    /**
     * The timestamp of the latest commit that the view is syncrhonzied with, or
     * `undefined` when the view is not synchronized.
     */
    readonly sync_timestamp?: Date;

    /** Version number of the latest commit that mutated the view */
    readonly last_change_version: number;

    /**
     * Timestamp of the latest commit that mutated the view, or
     * `undefined` when no commit has mutated the view.
     */
    readonly last_change_timestamp?: Date;

    /** The first version number that is purged */
    readonly purged_from_version: number;

    /** The last version number that is purged */
    readonly purged_until_version: number;

    /** The last version number that safe for shredded PII (remains at zero for non-disclosing views) */
    readonly shred_version: number;
}

/**
 * Options for getting a view snapshot
 * @public
 */
export interface ViewOptions {
    /** The minimum commit version for which a snapshot shall be returned */
    readonly sync: number;

    /** An abort signal that shall be observed while the snapshot is prepared */
    readonly signal: AbortSignal;

    /**
     * Specifies whether the view shall use authorization.
     * 
     * Authorization is skipped by default. To enable authorization set this
     * property to `true` or an {@link ErrorFactory} callback function.
     * 
     * The callback function is invoked to create the error that shall be thrown
     * when view access is forbidden.
     */
    readonly auth: boolean | ErrorFactory;
}

/**
 * Options for synchronizing views
 * @public
 */
export interface SyncOptions<K extends string = string> {
    /** The minimum commit version that shall be synchronized */
    readonly target: number;

    /**
     * An array of view keys that shall be synchronized.
     * 
     * Omit this property to synchronize all views.
     */
    readonly views: readonly K[];

    /** An abort signal that shall be observed while views are synchronized */
    readonly signal: AbortSignal;
}

/**
 * Options for purging views
 * @public
 */
export interface PurgeOptions {
    /** An abort signal that shall be observed while views are purged */
    readonly signal: AbortSignal;
}

/**
 * A function that creates an error to be thrown
 * @public
 */
export type ErrorFactory = () => Error;