import { Type, TypeOf } from "paratype";
import { EntityAuthFunc } from "./entity-projection";
import { EntityViews, PossibleKeysOf } from "./entity-view";
import { ReadModel } from "./model";
import { PiiString } from "./pii";

/**
 * Entity mapping projection
 * @public
 */
export interface EntityMapping<
    Props extends Record<string, unknown>,
    Key extends PossibleKeysOf<Props>,
    Source extends (string & keyof EntityViews<Views>),
    Scope = unknown,
    Views extends ReadModel = ReadModel,
    Dependencies extends (string & keyof Views)[] = [],
> {
    readonly kind: "mapped-entities";
    readonly type: Type<Props>;
    readonly key: Key;
    readonly source: Source;
    readonly dependencies: ReadonlySet<string & keyof Views>;
    map(
        source: TypeOf<EntityViews<Views>[Source]["type"]>, 
        disclose: (pii: PiiString) => Promise<string>
    ): Promise<Props>;
    auth?: EntityAuthFunc<Scope, Props, Pick<Views, Dependencies[number] | Source>>;
}
