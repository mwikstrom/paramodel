import { Type } from "paratype";
import { ActionHandler } from "./action-handler";
import { Projection } from "./projection";

export type ChangeModel<K extends string = string, T = unknown> = Readonly<Record<K, Type<T>>>;

export type ReadModel<K extends string = string, T extends Projection = Projection> = Readonly<Record<K, T>>;

export type WriteModel<K extends string = string, T extends ActionHandler = ActionHandler> = Readonly<Record<K, T>>;

export type DomainModel<Scope = unknown, Events = unknown, Views = unknown, Actions = unknown> = {
    readonly scope: Type<Scope>;
    readonly events: Events;
    readonly views: Views;
    readonly actions: Actions;
};

export const Forbidden = Symbol();
export type Forbidden = typeof Forbidden;
