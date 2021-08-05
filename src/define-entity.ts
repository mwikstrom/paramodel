import { Type, TypeOf } from "paratype";
import { Change } from "./change";
import { EntityProjectionFunc, EntityProjection, EntityAuthFunc } from "./entity-projection";
import { PossibleKeysOf } from "./entity-view";
import { ChangeModel, ReadModel } from "./model";

export function defineEntity<
    Props,
    Key extends PossibleKeysOf<Props>,
    Scope = unknown,
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Mutators extends (string & keyof Events)[] = [],
    Dependencies extends (string & keyof Views)[] = [],
>(
    type: Type<Props>,
    key: Key,
    on: {
        [K in Mutators[number]]: (
            EntityProjectionFunc<Props, Key, Change<TypeOf<Events[K]>, K>, Pick<Views, Dependencies[number]>>
        );
    },
    auth?: EntityAuthFunc<Scope, Props, Pick<Views, Dependencies[number]>>,
    dependencies?: Dependencies,
): EntityProjection<Props, Key, Events, Views, Scope> {
    const mutators = Object.freeze(new Set(Object.keys(on)));
    
    function isFunc(thing: unknown): thing is EntityProjectionFunc<Props, Key, Change, Views> {
        return typeof thing === "function";
    }
    
    const apply: EntityProjectionFunc<Props, Key, Change, Views> = async (change, ...rest) => {
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
        key,
        mutators,
        dependencies: Object.freeze(new Set(dependencies)),
        apply,
        auth,
    });
}
