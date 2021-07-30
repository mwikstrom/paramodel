import { Type, TypeOf } from "paratype";
import { Queryable, SortedQueryable } from "./query";

// DOMAIN MODEL:
// TODO: define event
// TODO: define state
// TODO: define query
// TODO: define entity
// TODO: define action

export type ChangeModel<K extends string = string, T = unknown> = Readonly<Record<K, Type<T>>>;

export type ReadModel<K extends string = string, T extends Projection = Projection> = Readonly<Record<K, T>>;

export type WriteModel<K extends string = string, T extends ActionHandler = ActionHandler> = Readonly<Record<K, T>>;

export interface ActionHandler<
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Input = unknown,
    Output = unknown,
> {
    readonly inputType: Type<Input>;
    readonly dependencies: ReadonlySet<string & keyof Views>;
    exec(context: ActionContext<Events, Views, Input, Output>): Promise<void>;
}

export interface ActionContext<
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Input = unknown,
    Output = unknown,
> {
    readonly version: number;
    readonly timestamp: Date;
    readonly user: number;
    readonly client: number;
    readonly input: Input;
    conflict(message: string): never;
    output(result: Output): void;
    emit<K extends string & keyof Events>(key: K, arg: TypeOf<Events[K]>): void;
    view: ViewSnapshot<Views>;
}

export interface Repository<C extends ChangeModel, R extends ReadModel> {
    readonly changes: SortedQueryable<ChangeType<C>>;
    view<K extends string & keyof R>(key: K, options?: ViewOptions): Promise<ViewOf<R[K]> | undefined>;
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

export type ViewOf<H extends Projection> =
        H extends StateProjection<infer T> ? StateView<T> :
        H extends QueryHandler<infer P, infer T> ? QueryView<P, T> :
        H extends EntityProjection<infer T> ? EntityView<T> :
        View;

export type Projection = StateProjection | QueryHandler | EntityProjection;

export type View = StateView | QueryView | EntityView;

export interface StateView<T = unknown> {
    readonly kind: "state";
    readonly version: number;
    read(): Promise<T>;
}

export interface StateProjection<
    T = unknown,
    C extends ChangeModel = ChangeModel,
    R extends ReadModel = ReadModel,
> {
    readonly kind: "state";
    readonly mutators: ReadonlySet<string & keyof C>;
    readonly dependencies: ReadonlySet<string & keyof R>;
    apply(change: ChangeType<C>, before: T, view: ViewSnapshot<R>): Promise<T>;
    init(): T;
}

export type ViewSnapshot<R extends ReadModel> = <K extends string & keyof R>(key: K) => Promise<ViewOf<R[K]>>;

export interface QueryView<P = unknown, T = unknown> {
    readonly kind: "query";
    readonly version: number;
    query(params: P): T;
}

export interface QueryHandler<
    P = unknown,
    T = unknown,
    R extends ReadModel = ReadModel,
> {
    readonly kind: "query";
    readonly dependencies: ReadonlySet<string & keyof R>;
    exec(view: ViewSnapshot<R>, params: P): Promise<T>;
}

export interface EntityView<
    T extends Record<string, unknown> = Record<string, unknown>
> extends ReadonlyEntityCollection<T> {
    readonly kind: "entities";    
    readonly version: number;
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
    readonly kind: "entities";
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