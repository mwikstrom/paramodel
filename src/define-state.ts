import { Type } from "paratype";
import { Change } from "./change";
import { ChangeModel, ReadModel } from "./model";
import { StateApplyFunc, StateAuthFunc, StateProjection } from "./state-projection";

export function defineState<
    State,
    Scope = unknown,
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Mutators extends (string & keyof Events)[] = [],
    Dependencies extends (string & keyof Views)[] = [],
>(
    type: Type<State>,
    initial: State,
    dependencies: Dependencies,
    on: {
        [K in Mutators[number]]: StateApplyFunc<Change<K, Events[K]>, Pick<Views, Dependencies[number]>, State>;
    },
    auth?: StateAuthFunc<Scope, State, Pick<Views, Dependencies[number]>>,
): StateProjection<State, Events, Views, Scope> {
    const mutators = Object.freeze(new Set(Object.keys(on)));
    
    function isFunc(thing: unknown): thing is StateApplyFunc<Change, Views, State> {
        return typeof thing === "function";
    }
    
    const apply: StateApplyFunc<Change, Views, State> = async (change, before, ...rest) => {
        if (change.key in on) {
            const func = on[change.key as Mutators[number]];
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
        auth,
    });
}
