import { Type, TypeOf } from "paratype";
import { Queryable, SortedQueryable } from "./query";

export type ChangeModel<K extends string = string, T = unknown> = Record<K, Type<T>>;

export function defineChange<K extends string, T>(key: K, type: Type<T>): ChangeModel<K, T> {
    return Object.fromEntries([[key, type]]) as ChangeModel<K, T>;
}

export type ReadModel<K extends string = string, T = unknown> = Record<K, T>;

// TODO: define state
// TODO: define query
// TODO: define entity

// TODO: write model

export interface Repository<C extends ChangeModel, R extends ReadModel> {
    readonly changes: SortedQueryable<ChangeRecordType<C>>;
    view<K extends keyof R>(key: K, options?: ViewOptions): Promise<View | undefined>;
}

export type ChangeRecordType<Model extends ChangeModel> = {
    [K in keyof Model]: K extends string ? ChangeRecord<K, TypeOf<Model[K]>> : never;
}[keyof Model];

export interface ChangeRecord<K extends string = string, T = unknown> extends ChangeReference {
    readonly timestamp: Date;
    readonly user: number;
    readonly client: number;
    readonly key: K;
    readonly arg: T;
}

export interface ChangeReference extends VersionReference {
    readonly offset: number;
}

export interface VersionReference {
    readonly version: number;
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

export type View = StateView | QueryView | EntityView;

export interface StateView<T = unknown> extends VersionReference {
    readonly kind: "state";
    read(): Promise<T>;
}

export interface QueryView<P = unknown, T = unknown> extends VersionReference {
    readonly kind: "query";
    query(params: P): T;
}

export interface EntityView<
    T extends Record<string, unknown> = Record<string, unknown>
> extends VersionReference, Queryable<Entity<T>> {
    readonly kind: "entities";
    get(id: number): Promise<Entity<T> | undefined>;
}

export type Entity<
    T extends Record<string, unknown> = Record<string, unknown>
> = T & { id: number };
