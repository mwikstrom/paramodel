import { Type } from "paratype";
import { Change } from "./change";
import { PossibleKeysOf, ReadonlyEntityCollection } from "./entity-view";
import { ChangeModel, Forbidden, ReadModel } from "./model";
import { ViewSnapshotFunc } from "./projection";
import { Queryable } from "./queryable";

/**
 * Entity state projection
 * @public
 */
export interface EntityProjection<
    T extends Record<string, unknown> = Record<string, unknown>,
    K extends PossibleKeysOf<T> = PossibleKeysOf<T>,
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

/**
 * A function that authorizes access to entities
 * @public
 */
export type EntityAuthFunc<
    Scope,
    T,
    R extends ReadModel = ReadModel
> = (query: Queryable<T>, scope: Scope, view: ViewSnapshotFunc<R>) => Promise<Queryable<T> | Forbidden>;

/**
 * A function that mutate entity states
 * @public
 */
export type EntityProjectionFunc<
    T,
    K extends PossibleKeysOf<T>,
    C extends Change = Change,
    R extends ReadModel = ReadModel,
> = (change: C, state: EntityProjectionState<T, K>, view: ViewSnapshotFunc<R>) => Promise<void>;

/**
 * The mutable state object provided as the second argument of {@link EntityProjectionFunc}
 * @public
 */
export interface EntityProjectionState<
    T = Record<string, unknown>, 
    K extends PossibleKeysOf<T> = PossibleKeysOf<T>
> {
    /** Provides access to entities as they were in previous commit */
    readonly base: ReadonlyEntityCollection<T, K>;

    /**
     * Writes an entity
     * @param this - <i>(Ignored)</i> This function uses implicit `this` binding
     * @param props - Entity props to write
     */
    put(this: void, props: T): void;

    /**
     * Removes an entity
     * @param this - <i>(Ignored)</i> This function uses implicit `this` binding
     * @param key - Key of the entity to remove
     */
    del(this: void, key: T[K]): void;
}
