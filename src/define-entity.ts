import { Type, TypeOf } from "paratype";
import { Change } from "./change";
import { EntityProjectionFunc, EntityProjection, EntityAuthFunc } from "./entity-projection";
import { PossibleKeysOf } from "./entity-view";
import { ChangeModel, ReadModel } from "./model";

/**
 * Creates an {@link EntityProjection}
 * @param this - <i>(Ignored)</i> This function uses implicit `this` binding
 * @param type - Type of entity
 * @param key - Name of the entity key property
 * @param mutators - An object that define how change events affect entities. 
 * 
 * Each property name must be the name of a change event and each property value must be
 * a function that shall be invoked to apply the effect that the corresponding event.
 * @param auth - <i>(Optional)</i> A function that provides authorization to entities.
 * @param dependencies - <i>(Optional)</i> A set of view keys that the entity projection depends upon.
 * 
 * @public
 */
export function defineEntity<
    Props extends Record<string, unknown>,
    Key extends PossibleKeysOf<Props>,
    Scope = unknown,
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Mutators extends (string & keyof Events)[] = [],
    Dependencies extends (string & keyof Views)[] = [],
>(
    this: void,
    type: Type<Props>,
    key: Key,
    mutators: {
        [K in Mutators[number]]: (
            EntityProjectionFunc<Props, Key, Change<TypeOf<Events[K]>, K>, Pick<Views, Dependencies[number]>>
        );
    },
    auth?: EntityAuthFunc<Scope, Props, Pick<Views, Dependencies[number]>>,
    dependencies?: Dependencies,
): EntityProjection<Props, Key, Events, Views, Scope> {
    const mutatorKeys = Object.freeze(new Set(Object.keys(mutators)));
    
    function isFunc(thing: unknown): thing is EntityProjectionFunc<Props, Key, Change, Views> {
        return typeof thing === "function";
    }
    
    const apply: EntityProjectionFunc<Props, Key, Change, Views> = async (change, ...rest) => {
        if (change.key in mutators) {
            const func = mutators[change.key as Mutators[number]];
            if (isFunc(func)) {
                return await func(change, ...rest);
            }
        }
    };

    return Object.freeze({
        kind: "entities",
        type,
        key,
        mutators: mutatorKeys,
        dependencies: Object.freeze(new Set(dependencies)),
        apply,
        auth,
    });
}
