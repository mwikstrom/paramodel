import { Type } from "paratype";
import { ActionHandler } from "./action-handler";
import { ChangeModel, ReadModel, WriteModel, DomainModel } from "./model";
import { Projection } from "./projection";

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
