import { Type } from "paratype";
import { Change } from "./change";
import { ReadonlyEntityCollection } from "./entity-view";
import { ChangeModel, ReadModel, Forbidden } from "./model";
import { ViewSnapshotFunc } from "./projection";
import { Filterable } from "./queryable";

export interface EntityProjection<
    T extends Record<string, unknown> = Record<string, unknown>,
    C extends ChangeModel = ChangeModel,
    R extends ReadModel = ReadModel,
    Scope = unknown
> {
    readonly kind: "entities";
    readonly type: Type<T>;
    readonly mutators: ReadonlySet<string & keyof C>;
    readonly dependencies: ReadonlySet<string & keyof R>;
    readonly apply: EntityProjectionFunc<Change, R, T>;
    readonly auth: EntityAuthFunc<Scope, T, R> | undefined;
}

export type EntityAuthFunc<
    Scope,
    T extends Record<string, unknown> = Record<string, unknown>,
    R extends ReadModel = ReadModel
> = (query: Filterable<T>, scope: Scope, view: ViewSnapshotFunc<R>) => Promise<Filterable<T> | Forbidden>;

export type EntityProjectionFunc<
    C extends Change = Change,
    R extends ReadModel = ReadModel,
    T extends Record<string, unknown> = Record<string, unknown>,
> = (change: C, state: EntityCollection<T>, view: ViewSnapshotFunc<R>) => Promise<void>;

export interface EntityCollection<
    T extends Record<string, unknown> = Record<string, unknown>,
> extends ReadonlyEntityCollection<T> {
    put(id: number, props: T): void;
    del(id: number): void;
}
