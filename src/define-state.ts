import { Type } from "paratype";
import { ChangeModel, ReadModel } from "./model";
import { StateApplyFunc, StateProjection } from "./state-projection";

export function defineState<
    Events extends ChangeModel,
    Views extends ReadModel,
    State,
    Mutators extends string & keyof Events,
    Dependencies extends (string & keyof Views)[],
>(
    type: Type<State>,
    initial: State,
    dependencies: Dependencies,
    on: {
        [K in Mutators]: StateApplyFunc<ChangeModel<K, Events[K]>, Pick<Views, Dependencies[number]>, State>;
    },
): StateProjection<State, Events, Views> {
    const mutators = Object.freeze(new Set(Object.keys(on)));
    
    function isFunc(thing: unknown): thing is StateApplyFunc<Events, Views, State> {
        return typeof thing === "function";
    }
    
    const apply: StateApplyFunc<Events, Views, State> = async (change, before, ...rest) => {
        if (change.key in on) {
            const func = on[change.key as Mutators];
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
        mutators,
        dependencies: Object.freeze(new Set(dependencies)),
        apply,
    });
}
