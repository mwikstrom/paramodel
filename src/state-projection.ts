import { Type } from "paratype";
import { ChangeType } from "./change";
import { ChangeModel, ReadModel } from "./model";
import { ViewSnapshotFunc } from "./projection";

export interface StateProjection<
    T = unknown,
    C extends ChangeModel = ChangeModel,
    R extends ReadModel = ReadModel,
> {
    readonly kind: "state";
    readonly type: Type<T>;
    readonly mutators: ReadonlySet<string & keyof C>;
    readonly dependencies: ReadonlySet<string & keyof R>;
    readonly initial: T;
    readonly apply: StateApplyFunc<C, R, T>;
    readonly auth: StateAuthFunc<Scope, T, R>;
}

export type StateAuthFunc<
    Scope = unknown,
    T = unknown,
    R extends ReadModel = ReadModel,
> = (this: void, scope: Scope, state: T, view: ViewSnapshotFunc<R>) => Promise<T | Forbidden>;

export type StateApplyFunc<
    C extends ChangeModel = ChangeModel,
    R extends ReadModel = ReadModel,
    T = unknown,
> = (this: void, change: ChangeType<C>, before: T, view: ViewSnapshotFunc<R>) => Promise<T>;
