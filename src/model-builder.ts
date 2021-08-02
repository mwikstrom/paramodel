import { Type, voidType } from "paratype";
import { ActionHandler } from "./action-handler";
import { ChangeModel, ReadModel, WriteModel, DomainModel } from "./model";
import { Projection } from "./projection";

export interface ModelBuilder<
    Scope = unknown,
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Actions extends WriteModel = WriteModel,
> {
    addEvent<EventKey extends string, EventArg>(
        this: void,
        key: EventKey, 
        type: Type<EventArg>,
    ): ModelBuilder<Scope, Events & ChangeModel<EventKey, EventArg>, Views, Actions>;

    addView<ViewKey extends string, Handler extends Projection>(
        this: void,
        key: ViewKey,
        handler: Handler,
    ): ModelBuilder<Scope, Events, Views & ReadModel<ViewKey, Handler>, Actions>;

    addAction<ActionKey extends string, Handler extends ActionHandler>(
        this: void,
        key: ActionKey,
        handler: Handler,
    ): ModelBuilder<Scope, Events, Views, Actions & WriteModel<ActionKey, ActionHandler>>;

    createModel(this: void): DomainModel<Scope, Events, Views, Actions>;

    use<T extends ModelBuilder>(setup: (this: void, builder: this) => T): T;
}

export function setupDomain(): ModelBuilder<void, ChangeModel, ReadModel, WriteModel>;
export function setupDomain<Scope>(scope: Type<Scope>): ModelBuilder<Scope, ChangeModel, ReadModel, WriteModel>;
export function setupDomain<Scope>(
    scope: Type<Scope | void> = voidType,
): ModelBuilder<Scope | void, ChangeModel, ReadModel, WriteModel> {
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
