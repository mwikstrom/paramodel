import { Type, TypeOf } from "paratype";
import { Change } from "./change";
import { ReadonlyEntityCollection } from "./entity-view";
import { ChangeModel, ReadModel, Forbidden } from "./model";
import { ViewSnapshotFunc } from "./projection";
import { Queryable } from "./queryable";

export interface EntityProjection<
    T,
    K extends keyof T,
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
    K extends keyof T,
    C extends Change = Change,
    R extends ReadModel = ReadModel,
> = (change: C, state: EntityCollection<T, K>, view: ViewSnapshotFunc<R>) => Promise<void>;

export interface EntityCollection<T, K extends keyof T> extends ReadonlyEntityCollection<T, K> {
    put(props: T): void;
    del(key: Pick<T, K>): void;
}

export type EntityChangeHandlers<
    C extends ChangeModel, 
    T, 
    K extends keyof T, 
    R extends ReadModel = ReadModel
> = Partial<{
    [E in keyof C]: EntityProjectionFunc<T, K, Change<TypeOf<C[E]>>, R>;
}>;
