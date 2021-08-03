import { Type, TypeOf } from "paratype";
import { Change } from "./change";
import { EntityProjectionFunc, EntityProjection, EntityAuthFunc } from "./entity-projection";
import { ChangeModel, ReadModel } from "./model";

export function defineEntity<
    Props,
    Scope = unknown,
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Mutators extends (string & keyof Events)[] = [],
    Dependencies extends (string & keyof Views)[] = [],
>(
    type: Type<Props>,
    on: {
        [K in Mutators[number]]: (
            EntityProjectionFunc<Change<TypeOf<Events[K]>, K>, Props, Pick<Views, Dependencies[number]>>
        );
    },
    auth?: EntityAuthFunc<Scope, Props, Pick<Views, Dependencies[number]>>,
    dependencies?: Dependencies,
): EntityProjection<Props, Events, Views, Scope> {
    const mutators = Object.freeze(new Set(Object.keys(on)));
    
    function isFunc(thing: unknown): thing is EntityProjectionFunc<Change, Props, Views> {
        return typeof thing === "function";
    }
    
    const apply: EntityProjectionFunc<Change, Props, Views> = async (change, ...rest) => {
        if (change.key in on) {
            const func = on[change.key as Mutators[number]];
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
