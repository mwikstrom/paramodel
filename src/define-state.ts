import { Type, TypeOf } from "paratype";
import { Change } from "./change";
import { ChangeModel, ReadModel } from "./model";
import { StateApplyFunc, StateAuthFunc, StateProjection } from "./state-projection";

/**
 * Settings that define a state projection
 * @public
 */
export interface StateDefinition<
    State,
    Events extends ChangeModel = ChangeModel,
    Scope = unknown,
    Views extends ReadModel = ReadModel,
    Mutators extends (string & keyof Events)[] = [],
    Dependencies extends (string & keyof Views)[] = [],
>{
    /** State type */
    type: Type<State>;

    /** Initial state (before the first commit) */
    initial: State;

    /**
     * An object that define the change event handlers that may mutate the defined state.
     * 
     * Each key in this object is the name of a change event and the corresponding value
     * is an {@link StateApplyFunc} that shall be invoked to apply the effect of that
     * change.
     */
    mutators: StateChangeHandlers<Pick<Events, Mutators[number]>, State, Pick<Views, Dependencies[number]>>;

    /** An optional {@link StateAuthFunc} that authorizes access to the defined state */
    auth?: StateAuthFunc<Scope, State, Pick<Views, Dependencies[number]>>;

    /**
     * Optional array of vies keys that the state projection depends upon.
     * 
     * These views will automatically be synced to the current version just before mutators
     * are applied and are made available via the `view` function (third argument of {@link StateApplyFunc}).
     */
    dependencies?: Dependencies;
}

/**
 * An object that define the change event handlers that may mutate the defined state.
 * 
 * Each key in this object is the name of a change event and the corresponding value
 * is an {@link StateApplyFunc} that shall be invoked to apply the effect of that
 * change.
 * 
 * @public
 */
export type StateChangeHandlers<
    Events extends ChangeModel,
    State,
    Views extends ReadModel = ReadModel
> = Partial<{
    [K in keyof Events]: StateApplyFunc<Change<TypeOf<Events[K]>>, State, Views>;
}>;

/**
 * Creates a {@link StateProjection}
 * @param this - <i>(Ignored)</i> This function uses implicit `this` binding
 * @param definition - State definition
 * @public
 */
export function defineState<
    State,
    Events extends ChangeModel = ChangeModel,
    Scope = unknown,
    Views extends ReadModel = ReadModel,
    Mutators extends (string & keyof Events)[] = [],
    Dependencies extends (string & keyof Views)[] = [],
>(
    this: void,
    definition: StateDefinition<State, Events, Scope, Views, Mutators, Dependencies>,
): StateProjection<State, Events, Views, Scope> {
    const {
        type,
        initial,
        mutators,
        auth,
        dependencies,
    } = definition;
    const mutatorKeys = Object.freeze(new Set(Object.keys(mutators)));
    
    function isFunc(thing: unknown): thing is StateApplyFunc<Change, State, Views> {
        return typeof thing === "function";
    }
    
    const apply: StateApplyFunc<Change, State, Views> = async (change, before, ...rest) => {
        if (change.key in mutators) {
            const func = mutators[change.key as Mutators[number]];
            if (isFunc(func)) {
                return await func(change, before, ...rest);
            }
        }
        return before;
    };

    return Object.freeze({
        kind: "state",
        type,
        initial,
        mutators: mutatorKeys,
        dependencies: Object.freeze(new Set(dependencies)),
        apply,
        auth,
    });
}
