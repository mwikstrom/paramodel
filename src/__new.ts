import { Type, TypeOf } from "paratype";
import { Queryable, SortedQueryable } from "./query";

export type ChangeModel<K extends string = string, T = unknown> = Record<K, Type<T>>;

export function defineChange<K extends string, T>(key: K, type: Type<T>): ChangeModel<K, T> {
    return Object.fromEntries([[key, type]]) as ChangeModel<K, T>;
}

export type ReadModel<K extends string = string, T = unknown> = Record<K, T>;

// TODO: define state
/*
export function defineState<
    K extends string,
    C extends ChangeModel,
    R extends ReadModel,
    D extends keyof R,
>(
) {
    throw new Error("TODO");
}
*/

// TODO: define query
// TODO: define entity

// TODO: write model

export interface Repository<C extends ChangeModel, R extends ReadModel> {
    readonly changes: SortedQueryable<ChangeType<C>>;
    view<K extends string & keyof R>(key: K, options?: ViewOptions): Promise<ReadModelView<R, K> | undefined>;
}

export type ChangeType<Model extends ChangeModel> = {
    [K in keyof Model]: K extends string ? Change<K, TypeOf<Model[K]>> : never;
}[keyof Model];

export interface Change<K extends string = string, T = unknown> {
    readonly version: number;
    readonly offset: number;
    readonly timestamp: Date;
    readonly user: number;
    readonly client: number;
    readonly key: K;
    readonly arg: T;
}

export interface ViewOptions<T extends number | undefined = undefined> {
    readonly version?: T;
    readonly align?: VersionAlignment<T>;
}

export type VersionAlignment<T> = (
    T extends number ? (
        "exact" |
        "fresh-after" |
        "fresh-before"
    ) : (
        "latest" |
        "latest-fresh"
    )
);

// TODO: Strongly typed read model view
export type ReadModelView<R extends ReadModel, K extends string & keyof R> = View;
export type View = StateView | QueryView | EntityView;

export interface StateView<T = unknown> {
    readonly version: number;
    readonly kind: "state";
    read(): Promise<T>;
}

export interface StateProjection<
    T = unknown,
    C extends ChangeModel = ChangeModel,
    R extends ReadModel = ReadModel,
> {
    readonly mutators: ReadonlySet<string & keyof C>;
    readonly dependencies: ReadonlySet<string & keyof R>;
    apply(change: ChangeType<C>, before: T, view: ViewSnapshot<R>): Promise<T>;
    init(): T;
}

export type ViewSnapshot<R extends ReadModel> = <K extends string & keyof R>(key: K) => Promise<ReadModelView<R, K>>;

export interface QueryView<P = unknown, T = unknown> {
    readonly version: number;
    readonly kind: "query";
    query(params: P): T;
}

export interface QueryHandler<
    R extends ReadModel = ReadModel,
    P = unknown,
    T = unknown
> {
    readonly dependencies: ReadonlySet<string & keyof R>;
    exec(view: ViewSnapshot<R>, params: P): Promise<T>;
}

export interface EntityView<
    T extends Record<string, unknown> = Record<string, unknown>
> extends ReadonlyEntityCollection<T> {
    readonly version: number;
    readonly kind: "entities";    
}

export interface ReadonlyEntityCollection<
    T extends Record<string, unknown> = Record<string, unknown>
> extends Queryable<Entity<T>> {
    get(id: number): Promise<Entity<T> | undefined>;
}

export interface EntityProjection<
    T extends Record<string, unknown> = Record<string, unknown>,
    C extends ChangeModel = ChangeModel,
    R extends ReadModel = ReadModel
> {
    readonly mutators: ReadonlySet<string & keyof C>;
    readonly dependencies: ReadonlySet<string & keyof R>;
    apply(change: ChangeType<C>, state: EntityCollection<T>, view: ViewSnapshot<R>): Promise<void>;
}

export interface EntityCollection<
    T extends Record<string, unknown> = Record<string, unknown>,
> extends ReadonlyEntityCollection<T> {
    put(id: number, props: T): void;
    del(id: number): void;
}

export type Entity<
    T extends Record<string, unknown> = Record<string, unknown>
> = T & { id: number };
