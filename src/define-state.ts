import { Type } from "paratype";
import { Change } from "./change";
import { ChangeModel, ReadModel } from "./model";
import { StateApplyFunc, StateAuthFunc, StateProjection } from "./state-projection";

/**
 * Creates a {@link StateProjection}
 * @param this - <i>(Ignored)</i> This function uses implicit `this` binding
 * @param type - Type of state
 * @param initial - The initial state
 * @param mutators - An object that define how change events affects the projected state. 
 * 
 * Each property name must be the name of a change event and each property value must be
 * a function that shall be invoked to apply the effect that the corresponding event.
 * @param auth - <i>(Optional)</i> A function that provides authorization to the projected state.
 * @param dependencies - <i>(Optional)</i> A set of view keys that the state projection depends upon.
 * 
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
    type: Type<State>,
    initial: State,
    mutators: {
        [K in Mutators[number]]: StateApplyFunc<Change<Events[K], K>, State, Pick<Views, Dependencies[number]>>;
    },
    auth?: StateAuthFunc<Scope, State, Pick<Views, Dependencies[number]>>,
    dependencies?: Dependencies,
): StateProjection<State, Events, Views, Scope> {
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
