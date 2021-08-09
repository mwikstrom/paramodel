import { TypeOf } from "paratype";
import { ChangeModel } from "./model";

/**
 * Data for a change event that has occurred
 * @public
 */
export interface Change<T = unknown, K extends string = string> {
    /** The commit version in which the change occurred */
    readonly version: number;

    /** Position of the change event among all committed events */
    readonly position: number;

    /** Timestamp when the change event was comitted */
    readonly timestamp: Date;

    /** The change event key */
    readonly key: K;

    /** The change event argument */
    readonly arg: T;
}

/**
 * Type alias for {@link Change | changes} in a given change model
 * @public
 */
export type ChangeType<Model extends ChangeModel> = {
    [K in keyof Model]: K extends string ? Change<TypeOf<Model[K]>, K> : never;
}[keyof Model];
