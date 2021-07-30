import { Type } from "paratype";
import { ActionHandler } from "./action-handler";
import { Projection } from "./projection";

export type ChangeModel<K extends string = string, T = unknown> = Readonly<Record<K, Type<T>>>;

export type ReadModel<K extends string = string, T extends Projection = Projection> = Readonly<Record<K, T>>;

export type WriteModel<K extends string = string, T extends ActionHandler = ActionHandler> = Readonly<Record<K, T>>;

export type DomainModel<
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Actions extends WriteModel = WriteModel,
> = {
    readonly events: Events;
    readonly views: Views;
    readonly actions: Actions;
};
