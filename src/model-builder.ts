import { Type, voidType } from "paratype";
import { ActionHandler } from "./action-handler";
import { ChangeModel, ReadModel, WriteModel, DomainModel } from "./model";
import { Projection } from "./projection";

export interface ModelBuilder<
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Actions extends WriteModel = WriteModel,
    Scope = unknown,
> {
    addEvent<EventKey extends string, EventArg>(
        this: void,
        key: EventKey, 
        type: Type<EventArg>,
    ): ModelBuilder<Events & ChangeModel<EventKey, EventArg>, Views, Actions, Scope>;

    addView<ViewKey extends string, Handler extends Projection>(
        this: void,
        key: ViewKey,
        handler: Handler,
    ): ModelBuilder<Events, Views & ReadModel<ViewKey, Handler>, Actions, Scope>;

    addAction<ActionKey extends string, Handler extends ActionHandler>(
        this: void,
        key: ActionKey,
        handler: Handler,
    ): ModelBuilder<Events, Views, Actions & WriteModel<ActionKey, ActionHandler>, Scope>;

    createModel(this: void): DomainModel<Events, Views, Actions, Scope>;

    with<T>(setup: (this: void, builder: this) => T): T;
}

export function setupDomain(): ModelBuilder<ChangeModel, ReadModel, WriteModel, void>;
export function setupDomain<Scope>(scope: Type<Scope>): ModelBuilder<ChangeModel, ReadModel, WriteModel, Scope>;
export function setupDomain<Scope>(
    scope: Type<Scope | void> = voidType,
): ModelBuilder<ChangeModel, ReadModel, WriteModel, Scope | void> {
    const createModel = () => Object.freeze({
        
    });

    const builder = Object.freeze({
        addEvent,
        addView,
        addAction,
        createModel,
    });

    return builder;
}
