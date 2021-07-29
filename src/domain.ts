import { Type, voidType } from "paratype";
import { Action } from "./action";
import { Collection } from "./collection";
import { Projection } from "./projection";

/** @public */
export const createDomainBuilder = (): MetaDomainBuilder<Type<unknown>> => createMetaBuilder(voidType);

/** @public */
export interface MetaDomainBuilder<M extends Type<any>> extends MetaDomain<M> {
    setupMeta<T extends Type<any>>(this: void, type: T): MetaDomainBuilder<T>;
    addEvents<T extends DomainEvents>(this: void, events: T): EventsDomainBuilder<M, T>;
    createDomain(this: void): Domain<M, {}, {}, {}, {}>;
}

/** @public */
export interface EventsDomainBuilder<M extends Type<any>, E extends DomainEvents> extends EventsDomain<M, E> {
    setupMeta<T extends Type<any>>(this: void, type: T): EventsDomainBuilder<T, E>;
    addEvents<T extends DomainEvents>(this: void, events: T): EventsDomainBuilder<M, E & T>;
    addActions<T extends DomainActions<ProjectionsDomain<M, E, {}, {}>>>(
        this: void,
        actions: T
    ): ActionsDomainBuilder<M, E, {}, {}, T>;
    addCollections<T extends DomainCollections<EventsDomain<M, E>>>(
        this: void,
        collections: T
    ): ProjectionsDomainBuilder<M, E, {}, T>;
    addProjections<T extends DomainProjections<EventsDomain<M, E>>>(
        this: void,
        projections: T
    ): ProjectionsDomainBuilder<M, E, T, {}>;
    createDomain(this: void): Domain<M, E, {}, {}, {}>;
}

/** @public */
export interface ProjectionsDomainBuilder<
    M extends Type<any>,
    E extends DomainEvents,
    P extends DomainProjections<EventsDomain<M, E>>,
    C extends DomainCollections<EventsDomain<M, E>>,
> extends ProjectionsDomain<M, E, P, C> {
    addActions<T extends DomainActions<ProjectionsDomain<M, E, P, C>>>(
        this: void,
        actions: T
    ): ActionsDomainBuilder<M, E, P, C, T>;
    addCollections<T extends DomainCollections<EventsDomain<M, E>>>(
        this: void,
        collections: T
    ): ProjectionsDomainBuilder<M, E, P, C & T>;
    addProjections<T extends DomainProjections<EventsDomain<M, E>>>(
        this: void,
        projections: T
    ): ProjectionsDomainBuilder<M, E, P & T, C>;
    createDomain(this: void): Domain<M, E, P, C, {}>;
}

/** @public */
export interface ActionsDomainBuilder<
    M extends Type<any>,
    E extends DomainEvents,
    P extends DomainProjections<EventsDomain<M, E>>,
    C extends DomainCollections<EventsDomain<M, E>>,
    A extends DomainActions<ProjectionsDomain<M, E, P, C>> = DomainActions<ProjectionsDomain<M, E, P, C>>,
> extends ActionsDomain<M, E, P, C, A> {
    addActions<T extends DomainActions<ProjectionsDomain<M, E, P, C>>>(
        this: void,
        actions: T
    ): ActionsDomainBuilder<M, E, P, C, A & T>;
    createDomain(this: void): Domain<M, E, P, C, A>;
}

/** @public */
export interface MetaDomain<
    M extends Type<any> = Type<any>,
> {
    readonly meta: M;
}

/** @public */
export interface EventsDomain<
    M extends Type<any> = Type<any>,
    E extends DomainEvents = DomainEvents,
> extends MetaDomain<M> {
    readonly events: E;
}

/** @public */
export interface ProjectionsDomain<
    M extends Type<any> = Type<any>,
    E extends DomainEvents = DomainEvents,
    P extends DomainProjections<EventsDomain<M, E>> = DomainProjections<EventsDomain<M, E>>,
    C extends DomainCollections<EventsDomain<M, E>> = DomainCollections<EventsDomain<M, E>>,
> extends EventsDomain<M, E> {
    readonly projections: P;
    readonly collections: C;
}

/** @public */
export interface ActionsDomain<
    M extends Type<any> = Type<any>,
    E extends DomainEvents = DomainEvents,
    P extends DomainProjections<EventsDomain<M, E>> = DomainProjections<EventsDomain<M, E>>,
    C extends DomainCollections<EventsDomain<M, E>> = DomainCollections<EventsDomain<M, E>>,
    A extends DomainActions<ProjectionsDomain<M, E, P, C>> = DomainActions<ProjectionsDomain<M, E, P, C>>,
> extends ProjectionsDomain<M, E, P, C> {
    readonly actions: A;
}

/** @public */
export type Domain<
    M extends Type<any> = Type<any>,
    E extends DomainEvents = DomainEvents,
    P extends DomainProjections<EventsDomain<M, E>> = DomainProjections<EventsDomain<M, E>>,
    C extends DomainCollections<EventsDomain<M, E>> = DomainCollections<EventsDomain<M, E>>,
    A extends DomainActions<ProjectionsDomain<M, E, P, C>> = DomainActions<ProjectionsDomain<M, E, P, C>>,
> = ActionsDomain<M, E, P, C, A>;

/** @public */
export type DomainEvents = Record<string, Type<any>>;

/** @public */
export type DomainProjections<D extends EventsDomain> = Record<string, Projection<D, Type<any>>>;

/** @public */
export type DomainCollections<D extends EventsDomain> = Record<string, Collection<D, Type<any>>>;

/** @public */
export type DomainActions<D extends ProjectionsDomain> = Record<string, Action<D, Type<any>, Type<any>>>;

const createMetaBuilder = <M extends Type<any>>(meta: M): MetaDomainBuilder<M> => Object.freeze({
    meta,
    setupMeta: type => createMetaBuilder(type),
    addEvents: events => createEventsBuilder(meta, events),
    createDomain: () => createDomain(meta, {}, {}, {}, {}),
});

const createEventsBuilder = <M extends Type<any>, E extends DomainEvents>(
    meta: M,
    events: E, 
): EventsDomainBuilder<M, E> => Object.freeze({
    events,
    meta,
    setupMeta: type => createEventsBuilder(type, events),
    addActions: actions => createActionsBuilder(meta, events, {}, {}, actions),
    addEvents: other => createEventsBuilder(meta, Object.freeze({ ...events, ...other })),
    addCollections: collections => createProjectionsBuilder(meta, events, {}, collections),
    addProjections: projections => createProjectionsBuilder(meta, events, projections, {}),
    createDomain: () => createDomain(meta, events, {}, {}, {}),
});

const createProjectionsBuilder = <
    M extends Type<any>,
    E extends DomainEvents,
    P extends DomainProjections<EventsDomain<M, E>>,
    C extends DomainCollections<EventsDomain<M, E>>
>(
    meta: M,
    events: E, 
    projections: P,
    collections: C,
): ProjectionsDomainBuilder<M, E, P, C> => Object.freeze({
    events,
    meta,
    projections,
    collections,
    addActions: actions => createActionsBuilder(meta, events, projections, collections, actions),
    addCollections: other => createProjectionsBuilder(
        meta,
        events,
        projections,
        Object.freeze({ ...collections, ...other })
    ),
    addProjections: other => createProjectionsBuilder(
        meta,
        events,
        Object.freeze({ ...projections, ...other }),
        collections
    ),
    createDomain: () => createDomain(meta, events, projections, collections, {}),
});

const createActionsBuilder = <
    M extends Type<any>,
    E extends DomainEvents,
    P extends DomainProjections<EventsDomain<M, E>>,
    C extends DomainCollections<EventsDomain<M, E>>,
    A extends DomainActions<ProjectionsDomain<M, E, P, C>> = DomainActions<ProjectionsDomain<M, E, P, C>>,
>(
    meta: M,
    events: E, 
    projections: P,
    collections: C,
    actions: A,
): ActionsDomainBuilder<M, E, P, C, A> => Object.freeze({
    events,
    meta,
    projections,
    collections,
    actions,
    addActions: other => createActionsBuilder(
        meta, 
        events, 
        projections, 
        collections, 
        Object.freeze({ ...actions, ...other }),
    ),
    createDomain: () => createDomain(meta, events, projections, collections, actions),
});

const createDomain = <
    M extends Type<any>,
    E extends DomainEvents,
    P extends DomainProjections<EventsDomain<M, E>>,
    C extends DomainCollections<EventsDomain<M, E>>,
    A extends DomainActions<ProjectionsDomain<M, E, P, C>> = DomainActions<ProjectionsDomain<M, E, P, C>>,
>(
    meta: M,
    events: E,
    projections: P,
    collections: C,
    actions: A,
): Domain<M, E, P, C, A> => Object.freeze({meta, events, projections, collections, actions});
