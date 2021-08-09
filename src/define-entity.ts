import { Type, TypeOf } from "paratype";
import { Change } from "./change";
import { EntityProjectionFunc, EntityProjection, EntityAuthFunc } from "./entity-projection";
import { PossibleKeysOf } from "./entity-view";
import { ChangeModel, ReadModel } from "./model";

/**
 * Settings that define an entity projection
 * @public
 */
export interface EntityDefinition<
    Props extends Record<string, unknown>,
    Key extends PossibleKeysOf<Props>,
    Scope = unknown,
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Mutators extends (string & keyof Events)[] = [],
    Dependencies extends (string & keyof Views)[] = [],
>{
    /** Entity type */
    type: Type<Props>;

    /** Entity key property */
    key: Key;

    /**
     * An object that define the change event handlers that may mutate entity states.
     * 
     * Each key in this object is the name of a change event and the corresponding value
     * is an {@link EntityProjectionFunc} that shall be invoked to apply the effect of that
     * change.
     */
    mutators: {
        [K in Mutators[number]]: (
            EntityProjectionFunc<Props, Key, Change<TypeOf<Events[K]>, K>, Pick<Views, Dependencies[number]>>
        );
    };

    /** An optional {@link EntityAuthFunc} that authorizes access to entities */
    auth?: EntityAuthFunc<Scope, Props, Pick<Views, Dependencies[number]>>;

    /**
     * Optional array of vies keys that the entity projection depends upon.
     * 
     * These views will automatically be synced to the current version just before mutators
     * are applied and are made available via the `view` function (third argument of {@link EntityProjectionFunc}).
     */
    dependencies?: Dependencies;
}

/**
 * Creates an {@link EntityProjection}
 * @param this - <i>(Ignored)</i> This function uses implicit `this` binding
 * @param definition - Entity definition
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
    definition: EntityDefinition<Props, Key, Scope, Events, Views, Mutators, Dependencies>,
): EntityProjection<Props, Key, Events, Views, Scope> {
    const {
        type,
        key,
        mutators,
        auth,
        dependencies,
    } = definition;
    
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
