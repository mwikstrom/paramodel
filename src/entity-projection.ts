import { Type, TypeOf } from "paratype";
import { Change } from "./change";
import { PossibleKeysOf, ReadonlyEntityCollection } from "./entity-view";
import { ChangeModel, Forbidden, ReadModel } from "./model";
import { ViewSnapshotFunc } from "./projection";
import { Queryable } from "./queryable";

export interface EntityProjection<
    T extends Record<string, unknown> = Record<string, unknown>,
    K extends PossibleKeysOf<T> = PossibleKeysOf<T>,
    C extends ChangeModel = ChangeModel,
    R extends ReadModel = ReadModel,
    Scope = unknown
> {
    readonly kind: "entities";
    readonly type: Type<T>;
    readonly key: K;
    readonly mutators: ReadonlySet<string & keyof C>;
    readonly dependencies: ReadonlySet<string & keyof R>;
    readonly apply: EntityProjectionFunc<T, K, Change, R>;
    readonly auth: EntityAuthFunc<Scope, T, R> | undefined;
}

export type EntityAuthFunc<
    Scope,
    T,
    R extends ReadModel = ReadModel
> = (query: Queryable<T>, scope: Scope, view: ViewSnapshotFunc<R>) => Promise<Queryable<T> | Forbidden>;

export type EntityProjectionFunc<
    T,
    K extends PossibleKeysOf<T>,
    C extends Change = Change,
    R extends ReadModel = ReadModel,
> = (change: C, state: EntityProjectionState<T, K>, view: ViewSnapshotFunc<R>) => Promise<void>;

export interface EntityProjectionState<
    T = Record<string, unknown>, 
    K extends PossibleKeysOf<T> = PossibleKeysOf<T>
> {
    readonly base: ReadonlyEntityCollection<T, K>;
    put(this: void, props: T): void;
    del(this: void, key: T[K]): void;
}

export type EntityChangeHandlers<
    C extends ChangeModel, 
    T, 
    K extends PossibleKeysOf<T>, 
    R extends ReadModel = ReadModel
> = Partial<{
    [E in keyof C]: EntityProjectionFunc<T, K, Change<TypeOf<C[E]>>, R>;
}>;
