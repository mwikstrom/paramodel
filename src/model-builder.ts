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

    use<T>(setup: (this: void, builder: this) => T): T;
}

export function setupDomain(): ModelBuilder<ChangeModel, ReadModel, WriteModel, void>;
export function setupDomain<Scope>(scope: Type<Scope>): ModelBuilder<ChangeModel, ReadModel, WriteModel, Scope>;
export function setupDomain<Scope>(
    scope: Type<Scope | void> = voidType,
): ModelBuilder<ChangeModel, ReadModel, WriteModel, Scope | void> {
    const events: Record<string, Type> = {};
    const views: Record<string, Projection> = {};
    const actions: Record<string, ActionHandler> = {};

    const addEvent = (key: string, type: Type) => {
        events[key] = type;
        return builder;
    };

    const addView = (key: string, projection: Projection) => {
        views[key] = projection;
        return builder;
    };

    const addAction = (key: string, handler: ActionHandler) => {
        actions[key] = handler;
        return builder;
    };

    const createModel = () => Object.freeze({
        scope,
        events: Object.freeze({...events}),
        views: Object.freeze({...views}),
        actions: Object.freeze({...actions}),
    });

    const use = <T>(setup: (builder: ModelBuilder) => T) => setup(builder);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = Object.freeze({
        addEvent,
        addView,
        addAction,
        createModel,
        use,
    });

    return builder;
}
