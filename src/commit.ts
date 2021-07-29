import { AbortOptions } from "./abort";

/** @public */
export interface Commit<M> {
    readonly timestamp: Date;
    readonly version: string;
    readonly local: boolean;
    readonly meta: M;
}

/** @public */
export interface CommitOptions<M> extends AbortOptions {
    maxAttempts?: number;
    meta?: M;
    // TODO: option for reading dirty?
}

/** @public */
export interface CommitSearchOptions {
    version?: string;
    timestamp?: Date;
    align?: "exact" | "after" | "before" | "exact-after" | "exact-before",
}