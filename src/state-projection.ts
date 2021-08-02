import { Type } from "paratype";
import { Change, ChangeType } from "./change";
import { ChangeModel, Forbidden, ReadModel } from "./model";
import { ViewSnapshotFunc } from "./projection";

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
    readonly apply: StateApplyFunc<Change, R, T>;
    readonly auth: StateAuthFunc<Scope, T, R> | undefined;
}

export type StateAuthFunc<
    Scope = unknown,
    T = unknown,
    R extends ReadModel = ReadModel,
> = (this: void, scope: Scope, state: T, view: ViewSnapshotFunc<R>) => Promise<T | Forbidden>;

export type StateApplyFunc<
    C extends Change = Change,
    R extends ReadModel = ReadModel,
    T = unknown,
> = (this: void, change: C, before: T, view: ViewSnapshotFunc<R>) => Promise<T>;
