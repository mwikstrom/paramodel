import { Type, TypeOf } from "paratype";
import { EntityMapping } from "./entity-mapping";
import { EntityAuthFunc } from "./entity-projection";
import { EntityViews, PossibleKeysOf } from "./entity-view";
import { ReadModel } from "./model";
import { Disclosed } from "./pii";

/**
 * Settings that define an entity mapping
 * @public
 */
export interface EntityMappingDefinition<
    Props extends Record<string, unknown>,
    Key extends PossibleKeysOf<Props>,
    Source extends (string & keyof EntityViews<Views>),
    Scope = unknown,
    Views extends ReadModel = ReadModel,
    Dependencies extends (string & keyof Views)[] = [],
>{
    /** Entity type */
    type: Type<Props>;

    /** Entity key property (must be same as in source view) */
    key: Key;

    /** Source entity view */
    source: Source;

    /** The entity mapping func */
    map(
        source: TypeOf<EntityViews<Views>[Source]["type"]>, 
        disclose: <T>(value: T) => Promise<Disclosed<T>>,
    ): Promise<Props>;

    /** An optional {@link EntityAuthFunc} that authorizes access to entities */
    auth?: EntityAuthFunc<Scope, Props, Pick<Views, Dependencies[number] | Source>>;

    /**
     * Optional array of view keys that the authorization function depends upon.
     * 
     * The source entity view is an implicit dependency.
     */
     dependencies?: Dependencies;
}

/**
 * Creates an {@link EntityMappingDefinition}
 * @param this - <i>(Ignored)</i> This function uses implicit `this` binding
 * @param definition - Mapping definition
 * @public
 */
export function defineEntityMapping<
    Props extends Record<string, unknown>,
    Key extends PossibleKeysOf<Props>,
    Source extends (string & keyof EntityViews<Views>),
    Scope = unknown,
    Views extends ReadModel = ReadModel,
    Dependencies extends (string & keyof Views)[] = [],
>(
    this: void,
    definition: EntityMappingDefinition<Props, Key, Source, Scope, Views, Dependencies>,
): EntityMapping<Props, Key, Source, Scope, Views, Dependencies> {
    const {
        type,
        key,
        source,
        map,
        auth,
        dependencies,
    } = definition;
    
    return Object.freeze({
        kind: "mapped-entities",
        type,
        key,
        source,
        map,
        auth,
        dependencies: Object.freeze(new Set(dependencies).add(source)),
    });
}
