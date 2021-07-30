import { Type } from "paratype";
import { ChangeType } from "./change";
import { ChangeModel, ReadModel } from "./model";
import { ViewSnapshot } from "./projection";

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
}

export type StateApplyFunc<
    C extends ChangeModel = ChangeModel,
    R extends ReadModel = ReadModel,
    T = unknown,
> = (this: void, change: ChangeType<C>, before: T, view: ViewSnapshot<R>) => Promise<T>;
