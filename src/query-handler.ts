import { Type } from "paratype";
import { ReadModel } from "./model";
import { ViewSnapshotFunc } from "./projection";

export interface QueryHandler<
    P extends Record<string, unknown> = Record<string, unknown>,
    T = unknown,
    R extends ReadModel = ReadModel,
> {
    readonly kind: "query";
    readonly type: Type<T>;
    readonly params: Type<P>;
    readonly dependencies: ReadonlySet<string & keyof R>;
    readonly exec: QueryFunc<R, P, T>;
}

export type QueryFunc<
    R extends ReadModel = ReadModel,
    P extends Record<string, unknown> = Record<string, unknown>,
    T = unknown,
> = (view: ViewSnapshotFunc<R>, params: P) => Promise<T>;
