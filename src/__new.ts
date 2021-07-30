import { Type, TypeOf } from "paratype";
import { Queryable, SortedQueryable } from "./query";

export type ChangeModel<K extends string = string, T = unknown> = Readonly<Record<K, Type<T>>>;

export type ReadModel<K extends string = string, T extends Projection = Projection> = Readonly<Record<K, T>>;

export type WriteModel<K extends string = string, T extends ActionHandler = ActionHandler> = Readonly<Record<K, T>>;

export interface ActionHandler<
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Input = unknown,
    Output = unknown,
> {
    readonly input: Type<Input>;
    readonly output: Type<Output>;
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
    readonly input: Input;
    conflict(message: string): never;
    output(result: Output): void;
    emit<K extends string & keyof Events>(key: K, arg: TypeOf<Events[K]>): void;
    view: ViewSnapshot<Views>;
}

export type DomainModel<
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Actions extends WriteModel = WriteModel,
> = {
    readonly events: Events;
    readonly views: Views;
    readonly actions: Actions;
};

export function defineState<
    Events extends ChangeModel,
    Views extends ReadModel,
    State,
    MutatorKeys extends keyof Events,
    DependencyKeys extends keyof Views,
>(
// TODO: State definition
): StateProjection<State, Pick<Events, MutatorKeys>, Pick<Views, DependencyKeys>> {
    throw new Error("TODO");
}

export function defineQuery<
    Views extends ReadModel,
    Dependencies extends (keyof Views)[],
    Params extends Record<string, unknown>,
    Result,
>(
    model: Pick<DomainModel<ChangeModel, Views>, "views">,
    params: Type<Params>,
    result: Type<Result>,
    dependencies: Dependencies,
    exec: QueryFunc<Pick<Views, Dependencies[number]>, Params, Result>,
): QueryHandler<Params, Result, Pick<Views, Dependencies[number]>> {
    throw new Error("TODO");
}

export function defineEntity<
    Events extends ChangeModel,
    Views extends ReadModel,
    Props extends Record<string, unknown>,
    Mutators extends (keyof Events)[],
    Dependencies extends (keyof Views)[],
>(
    model: Pick<DomainModel<Events, Views>, "events" | "views">,
    props: Type<Props>,
    mutators: Mutators,
    dependencies: Dependencies,
    apply: EntityProjectionFunc<Pick<Events, Mutators[number]>, Pick<Views, Dependencies[number]>, Props>,
): EntityProjection<Props, Pick<Events, Mutators[number]>, Pick<Views, Dependencies[number]>> {
    throw new Error("TODO");
}

export function defineAction<
    Events extends ChangeModel,
    Views extends ReadModel,
    Input,
    Output,
    DependencyKeys extends keyof Views,
>(
// TODO: Action definition
): ActionHandler<Events, Pick<Views, DependencyKeys>, Input, Output> {
    throw new Error("TODO");
}

export interface ModelBuilder<
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Actions extends WriteModel = WriteModel,
> {
    addEvent<EventKey extends string, EventArg>(
        key: EventKey, 
        type: Type<EventArg>,
    ): ModelBuilder<Events & ChangeModel<EventKey, EventArg>, Views, Actions>;

    addView<ViewKey extends string, Handler extends Projection>(
        key: ViewKey,
        handler: Handler,
    ): ModelBuilder<Events, Views & ReadModel<ViewKey, Handler>, Actions>;

    addAction<ActionKey extends string, Handler extends ActionHandler>(
        key: ActionKey,
        handler: Handler,
    ): ModelBuilder<Events, Views, Actions & WriteModel<ActionKey, ActionHandler>>;

    createModel(): DomainModel<Events, Views, Actions>;
}

// TODO: DomainContext: user auth stuff (expose in action and view handlers)

export interface DomainStoreProvider {
    get<Model extends DomainModel>(
        id: string, 
        model: Model,
    ): DomainStore<Model>;
}

export interface DomainStore<Model extends DomainModel> {
    readonly changes: SortedQueryable<ChangeType<Model["events"]>>;
    do<K extends string & keyof Model["actions"]>(
        key: K,
        input: TypeOf<Model["actions"][K]["input"]>,
        options?: ActionOptions,
    ): Promise<ActionResultType<Model, K>>;
    view<K extends string & keyof Model["views"]>(
        key: K,
        options?: ViewOptions
    ): Promise<ViewOf<Model["views"][K]> | undefined>;
}

export interface ActionOptions {
    dry?: boolean;
}

export type ActionResultType<
    Model extends Pick<DomainModel, "actions" | "events">,
    Action extends string & keyof Model["actions"],
> = (
    ActionResult<Model["events"], TypeOf<Model["actions"][Action]["output"]>>
);

export interface ActionResult<Events extends ChangeModel, Output> {
    readonly timestamp: Date;
    readonly base: number;
    readonly success: boolean;
    readonly changes: readonly ChangeType<Events>[];
    readonly committed?: number;
    readonly conflict?: string;
    readonly output?: Output;
}

export type ChangeType<Model extends ChangeModel> = {
    [K in keyof Model]: K extends string ? Change<K, TypeOf<Model[K]>> : never;
}[keyof Model];

export interface Change<K extends string = string, T = unknown> {
    readonly version: number;
    readonly offset: number;
    readonly timestamp: Date;
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
    readonly initial: T;
    apply(change: ChangeType<C>, before: T, view: ViewSnapshot<R>): Promise<T>;
}

export type ViewSnapshot<R extends ReadModel> = <K extends string & keyof R>(key: K) => Promise<ViewOf<R[K]>>;

export interface QueryView<P = unknown, T = unknown> {
    readonly kind: "query";
    readonly version: number;
    query(params: P): T;
}

export interface QueryHandler<
    P extends Record<string, unknown> = Record<string, unknown>,
    T = unknown,
    R extends ReadModel = ReadModel,
> {
    readonly kind: "query";
    readonly dependencies: ReadonlySet<string & keyof R>;
    readonly exec: QueryFunc<R, P, T>;
}

export type QueryFunc<
    R extends ReadModel = ReadModel,
    P extends Record<string, unknown> = Record<string, unknown>,
    T = unknown,
> = (view: ViewSnapshot<R>, params: P) => Promise<T>;

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
    readonly apply: EntityProjectionFunc<C, R, T>;
}

export type EntityProjectionFunc<
    C extends ChangeModel = ChangeModel,
    R extends ReadModel = ReadModel,
    T extends Record<string, unknown> = Record<string, unknown>,
> = (change: ChangeType<C>, state: EntityCollection<T>, view: ViewSnapshot<R>) => Promise<void>;

export interface EntityCollection<
    T extends Record<string, unknown> = Record<string, unknown>,
> extends ReadonlyEntityCollection<T> {
    put(id: number, props: T): void;
    del(id: number): void;
}

export type Entity<
    T extends Record<string, unknown> = Record<string, unknown>
> = T & { id: number };
