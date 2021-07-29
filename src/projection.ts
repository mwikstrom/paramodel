import { Type, TypeOf } from "paratype";
import { Commit } from "./commit";
import { EventsDomain, ProjectionsDomain } from "./domain";
import { Snapshot } from "./snapshot";

/** @public */
export interface Projection<D extends EventsDomain, T extends Type<unknown>> {
    readonly type: T;
    readonly on: Partial<ProjectionHandlers<D, T>>;
    init(): TypeOf<T>;
}

/** @public */
export type ProjectionType<P extends Projection<EventsDomain, Type<unknown>>> =
    P extends Projection<EventsDomain, infer T> ? TypeOf<T> : never;

/** @public */
export type ProjectionHandlers<D extends EventsDomain, T extends Type<unknown>> = {
    [K in keyof D["events"]]: ProjectionFunc<TypeOf<D["events"][K]>, T, K, TypeOf<D["meta"]>>;
};

/** @public */
export type ProjectionFunc<E, T, K, M> = (this: void, context: ProjectionContext<E, T, K, M>) => T;

/** @public */
export interface ProjectionContext<E, T, K, M> {
    readonly before: T;
    readonly commit: Commit<M>;
    readonly change: K;
    readonly arg: E;
}

/** @public */
export interface ProjectionView<D extends ProjectionsDomain, K extends keyof D["projections"]> {
    readonly snapshot: Snapshot<D>;
    readonly key: K;
    readonly value: ProjectionType<D["projections"][K]>;
}