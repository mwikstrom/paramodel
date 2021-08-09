import { Type } from "paratype";
import { Change } from "./change";
import { ChangeModel, Forbidden, ReadModel } from "./model";
import { ViewSnapshotFunc } from "./projection";

/**
 * Simple state projection
 * @public
 */
export interface StateProjection<
    T = unknown,
    C extends ChangeModel = ChangeModel,
    R extends ReadModel = ReadModel,
    Scope = unknown,
> {
    readonly kind: "state";
    readonly type: Type<T>;
    readonly mutators: ReadonlySet<string & keyof C>;
    readonly dependencies: ReadonlySet<string & keyof R>;
    readonly initial: T;
    readonly apply: StateApplyFunc<Change, T, R>;
    readonly auth: StateAuthFunc<Scope, T, R> | undefined;
}

/**
 * A function that authorizes access to the projected state
 * @public
 */
export type StateAuthFunc<
    Scope = unknown,
    T = unknown,
    R extends ReadModel = ReadModel,
> = (this: void, scope: Scope, state: T, view: ViewSnapshotFunc<R>) => Promise<T | Forbidden>;

/**
 * A function that mutates projected state
 * @public
 */
export type StateApplyFunc<
    C extends Change = Change,
    T = unknown,
    R extends ReadModel = ReadModel,
> = (this: void, change: C, before: T, view: ViewSnapshotFunc<R>) => Promise<T>;
