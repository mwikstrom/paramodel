import { Type } from "paratype";
import { Forbidden, ReadModel } from "./model";
import { ViewSnapshotFunc } from "./projection";

export interface QueryHandler<
    P extends Record<string, unknown> = Record<string, unknown>,
    T = unknown,
    R extends ReadModel = ReadModel,
    Scope = unknown,
> {
    readonly kind: "query";
    readonly type: Type<T>;
    readonly params: Type<P>;
    readonly dependencies: ReadonlySet<string & keyof R>;
    readonly exec: QueryFunc<R, P, Scope, T>;
}

export type QueryFunc<
    R extends ReadModel = ReadModel,
    P extends Record<string, unknown> = Record<string, unknown>,
    Scope = unknown,
    T = unknown,
> = (view: ViewSnapshotFunc<R>, params: P, scope: Scope) => Promise<T | Forbidden>;
