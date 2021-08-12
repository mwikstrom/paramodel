import { EntityProjection } from "./entity-projection";
import { ReadModel } from "./model";
import { Queryable } from "./queryable";

/**
 * A snapshot of entities
 * @public
 */
export interface EntityView<
    T extends Record<string, unknown> = Record<string, unknown>,
    K extends PossibleKeysOf<T> = PossibleKeysOf<T>
> extends ReadonlyEntityCollection<T, K> {
    readonly kind: "entities" | "mapped-entities";
    readonly version: number;
}

/**
 * A readonly collection of entities
 * @public
 */
export interface ReadonlyEntityCollection<T, K extends PossibleKeysOf<T> = PossibleKeysOf<T>> extends Queryable<T> {
    get(this: void, key: T[K]): Promise<T | undefined>;
}

/**
 * Extracts the possible keys of an entity type
 * @public
 */
export type PossibleKeysOf<T> = {
    [P in keyof T]: T[P] extends (string | number | unknown) ? P extends string ? P : never : never;
}[keyof T];

/**
 * Extracts all entity views from a read model
 * @public
 */
export type EntityViews<AllViews extends ReadModel> = {
    [P in keyof AllViews]: AllViews[P] extends EntityProjection ? AllViews[P] : never;
};
