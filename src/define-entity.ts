import { Type } from "paratype";
import { EntityProjectionFunc, EntityProjection, EntityAuthFunc } from "./entity-projection";
import { ChangeModel, ReadModel } from "./model";

export function defineEntity<
    Events extends ChangeModel,
    Views extends ReadModel,
    Scope,
    Props extends Record<string, unknown>,
    Mutators extends string & keyof Events,
    Dependencies extends (string & keyof Views)[],
>(
    type: Type<Props>,
    dependencies: Dependencies,
    on: {
        [K in Mutators]: EntityProjectionFunc<ChangeModel<K, Events[K]>, Pick<Views, Dependencies[number]>, Props>;
    },
    auth?: EntityAuthFunc<Scope, Props, Pick<Views, Dependencies[number]>>,
): EntityProjection<Props, Events, Views, Scope> {
    const mutators = Object.freeze(new Set(Object.keys(on)));
    
    function isFunc(thing: unknown): thing is EntityProjectionFunc<Events, Views, Props> {
        return typeof thing === "function";
    }
    
    const apply: EntityProjectionFunc<Events, Views, Props> = async (change, ...rest) => {
        if (change.key in on) {
            const func = on[change.key as Mutators];
            if (isFunc(func)) {
                return await func(change, ...rest);
            }
        }
    };

    return Object.freeze({
        kind: "entities",
        type,
        mutators,
        dependencies: Object.freeze(new Set(dependencies)),
        apply,
        auth,
    });
}
