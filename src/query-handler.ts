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
    readonly exec: QueryExecFunc<R, P, Scope, T>;
    readonly auth?: QueryAuthFunc<R, P, Scope, T>;
}

export type QueryExecFunc<
    R extends ReadModel = ReadModel,
    P extends Record<string, unknown> = Record<string, unknown>,
    Scope = unknown,
    T = unknown,
> = (
    this: void, 
    view: ViewSnapshotFunc<R>, 
    params: P, 
    scope: Scope
) => Promise<T>;

export type QueryAuthFunc<
    R extends ReadModel = ReadModel,
    P extends Record<string, unknown> = Record<string, unknown>,
    Scope = unknown,
    T = unknown,
> = (
    this: void, 
    exec: QueryExecFunc<R, P, Scope, T>,
    view: ViewSnapshotFunc<R>, 
    params: P, 
    scope: Scope, 
) => Promise<T | Forbidden>;