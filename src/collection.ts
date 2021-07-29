import { Type, TypeOf } from "paratype";
import { Commit } from "./commit";
import { EventsDomain, ProjectionsDomain } from "./domain";
import { Snapshot } from "./snapshot";

/** @public */
export interface Collection<D extends EventsDomain, T extends Type<any>> {
    readonly entity: T;
    readonly on: Partial<CollectionHandlers<D, T>>;
}

/** @public */
export type CollectionHandlers<D extends EventsDomain, T extends Type<any>> = {
    [K in keyof D["events"]]: CollectionFunc<D, T, K>;
};

/** @public */
export type CollectionFunc<D extends EventsDomain, T extends Type<any>, K extends keyof D["events"]> = (
    this: void,
    context: CollectionContext<D, T, K>,
) => Promise<void>;

/** @public */
export interface CollectionContext<D extends EventsDomain, T extends Type<any>, K extends keyof D["events"]> {
    readonly commit: Commit<TypeOf<D["meta"]>>;
    readonly change: K;
    readonly input: TypeOf<D["events"][K]>;
    del(id: number): void;
    get(id: number): Promise<TypeOf<T> | undefined>;
    put(id: number, value: TypeOf<T>): void;
    // TODO: query!
}

/** @public */
export interface CollectionView<D extends ProjectionsDomain, K extends keyof D["collections"]> {
    readonly snapshot: Snapshot<D>;
    readonly key: K;
    alloc(): number;
    get(id: number): Promise<TypeOf<D["collections"][K]["entity"]> | undefined>;
    // TODO: query!
}
