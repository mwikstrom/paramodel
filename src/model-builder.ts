import { Type, voidType } from "paratype";
import { ActionFunc, ActionHandler } from "./action-handler";
import { EntityAuthFunc, EntityProjection, EntityProjectionFunc } from "./entity-projection";
import { ChangeModel, ReadModel, WriteModel, DomainModel } from "./model";
import { Projection } from "./projection";
import { QueryFunc, QueryHandler } from "./query-handler";
import { StateApplyFunc, StateAuthFunc, StateProjection } from "./state-projection";

export interface ModelBuilder<
    Scope = unknown,
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Actions extends WriteModel = WriteModel,
> {
    defineEvent<EventKey extends string, EventArg>(
        this: void,
        definition: {
            key: EventKey,
            type: Type<EventArg>,
        }
    ): ModelBuilder<
        Scope,
        Events & Readonly<Record<EventKey, Type<EventArg>>>,
        Views,
        Actions
    >;

    defineEntity<
        ViewKey extends string,
        Props extends Record<string, unknown>,
        Mutators extends (string & keyof Events)[] = [],
        Dependencies extends (string & keyof Views)[] = [],
    >(
        this: void,
        definition: {
            key: ViewKey,
            type: Type<Props>,
            on: {
                [K in Mutators[number]]: (
                    EntityProjectionFunc<Pick<Events, K>, Pick<Views, Dependencies[number]>, Props>
                );
            },
            dependencies?: Dependencies,
            auth?: EntityAuthFunc<Scope, Props, Pick<Views, Dependencies[number]>>,
        }
    ): ModelBuilder<
        Scope,
        Events,
        Views & Readonly<Record<ViewKey, EntityProjection<Props, Events, Views, Scope>>>, 
        Actions
    >;

    defineState<
        ViewKey extends string,
        State,
        Mutators extends (string & keyof Events)[] = [],
        Dependencies extends (string & keyof Views)[] = [],
    >(
        this: void,
        definition: {
            key: ViewKey,
            type: Type<State>,
            initial: State,
            on: {
                [K in Mutators[number]]: (
                    StateApplyFunc<Pick<Events, K>, Pick<Views, Dependencies[number]>, State>
                );
            },
            dependencies?: Dependencies,
            auth?: StateAuthFunc<Scope, State, Pick<Views, Dependencies[number]>>,
        }
    ): ModelBuilder<
        Scope,
        Events,
        Views & Readonly<Record<ViewKey, StateProjection<State, Events, Views, Scope>>>,
        Actions
    >;

    defineQuery<
        ViewKey extends string,
        Params extends Record<string, unknown>,
        Result,
        Dependencies extends (string & keyof Views)[] = []
    >(
        this: void,
        definition: {
            key: ViewKey,
            type: Type<Result>,
            params: Type<Params>,
            exec: QueryFunc<Pick<Views, Dependencies[number]>, Params, Scope, Result>,
            dependencies?: Dependencies,
        }
    ): ModelBuilder<
        Scope,
        Events,
        Views & Readonly<Record<ViewKey, QueryHandler<Params, Result, Views, Scope>>>,
        Actions
    >;
    
    defineAction<
        ActionKey extends string,
        Input,
        Output,
        Dependencies extends (string & keyof Views)[] = []
    >(
        this: void,
        definition: {
            key: ActionKey,
            input: Type<Input>,
            output: Type<Output>,
            exec: ActionFunc<Events, Pick<Views, Dependencies[number]>, Scope, Input, Output>,        
            dependencies?: Dependencies,
        }
    ): ModelBuilder<
        Scope,
        Events,
        Views,
        Actions & Readonly<Record<ActionKey, ActionHandler<Events, Views, Scope, Input, Output>>>
    >;

    createModel(this: void): DomainModel<Scope, Events, Views, Actions>;

    use<T extends ModelBuilder>(setup: (this: void, builder: this) => T): T;
}

export function setupDomain(): ModelBuilder<void, ChangeModel, ReadModel, WriteModel>;
export function setupDomain<Scope>(scope: Type<Scope>): ModelBuilder<Scope, ChangeModel, ReadModel, WriteModel>;
export function setupDomain<Scope>(
    scope: Type<Scope | void> = voidType,
): ModelBuilder<Scope | void, ChangeModel, ReadModel, WriteModel> {
    // TODO: THIS IMPLEMENTATION IS BROKEN!

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
