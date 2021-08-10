import { Type } from "paratype";
import { ActionHandler, AnyActionHandler } from "./action-handler";
import { AnyProjection } from "./projection";

// TODO: Support declaring PII props in events

/**
 * Alias for an unknown change model
 * @public
 */
export type ChangeModel<K extends string = string, T = unknown> = Readonly<Record<K, Type<T>>>;

/**
 * Alias for an unknown read model
 * @public
 */
export type ReadModel<K extends string = string, T extends AnyProjection = AnyProjection> = Readonly<Record<K, T>>;

/**
 * Alias for an unknown write model
 * @public
 */
export type WriteModel<K extends string = string, T extends ActionHandler = AnyActionHandler> = Readonly<Record<K, T>>;

/**
 * Alias for a domain model
 * @public
 */
export type DomainModel<
    Scope = unknown,
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Actions extends WriteModel = WriteModel,
> = {
    /** The domain access scope */
    readonly scope: Type<Scope>;

    /** The change model */
    readonly events: Events;

    /** The read model */
    readonly views: Views;

    /** The write model */
    readonly actions: Actions;
};

/**
 * A well-known symbol that can be used to indicate that an action failed due to a conflict
 * @public
 */
export const Conflict = Symbol();

/**
 * Type of the well-known conflict symbol
 * @public
 */
export type Conflict = typeof Conflict;

/**
 * A well-known symbol that can be used to indicate that an action failed because the 
 * domain access scope is not permitted to execute it
 * @public
 */
export const Forbidden = Symbol();

/**
 * Type of the well-known forbidden symbol
 * @public
 */
export type Forbidden = typeof Forbidden;
