import { Type } from "paratype";
import { ActionHandler, AnyActionHandler } from "./action-handler";
import { AnyProjection } from "./projection";

export type ChangeModel<K extends string = string, T = unknown> = Readonly<Record<K, Type<T>>>;

export type ReadModel<K extends string = string, T extends AnyProjection = AnyProjection> = Readonly<Record<K, T>>;

export type WriteModel<K extends string = string, T extends ActionHandler = AnyActionHandler> = Readonly<Record<K, T>>;

export type DomainModel<
    Scope = unknown,
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Actions extends WriteModel = WriteModel,
> = {
    readonly scope: Type<Scope>;
    readonly events: Events;
    readonly views: Views;
    readonly actions: Actions;
};

export const Conflict = Symbol();
export type Conflict = typeof Conflict;

export const Forbidden = Symbol();
export type Forbidden = typeof Forbidden;
