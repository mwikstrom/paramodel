import { Type, TypeOf } from "paratype";
import { Commit } from "./commit";
import { EventsDomain, ProjectionsDomain } from "./domain";
import { Queryable } from "./query";
import { Snapshot } from "./snapshot";

/** @public */
export interface Collection<D extends EventsDomain, T extends Type<unknown>> {
    readonly entity: T;
    readonly on: Partial<CollectionHandlers<D, T>>;
}

/** @public */
export type CollectionHandlers<D extends EventsDomain, T extends Type<unknown>> = {
    [K in keyof D["events"]]: CollectionFunc<D, T, K>;
};

/** @public */
export type CollectionFunc<D extends EventsDomain, T extends Type<unknown>, K extends keyof D["events"]> = (
    this: void,
    context: CollectionContext<D, T, K>,
) => Promise<void>;

/** @public */
export interface CollectionContext<
    D extends EventsDomain,
    T extends Type<unknown>,
    K extends keyof D["events"]
> extends QueryableCollection<TypeOf<T>> {
    readonly commit: Commit<TypeOf<D["meta"]>>;
    readonly change: K;
    readonly input: TypeOf<D["events"][K]>;
    del(id: number): void;
    put(id: number, value: TypeOf<T>): void;
}

/** @public */
export interface CollectionView<
    D extends ProjectionsDomain,
    K extends keyof D["collections"]
> extends QueryableCollection<TypeOf<D["collections"][K]["entity"]>> {
    readonly snapshot: Snapshot<D>;
    alloc(): number;
}

/** @public */
export interface QueryableCollection<T> extends Queryable<T> {
    get(id: number): Promise<T | undefined>;
}