import { Type } from "paratype";
import { EntityProjectionFunc, EntityProjection } from "./entity-projection";
import { ChangeModel, ReadModel } from "./model";

// TODO: "on" instead of mutators and apply
export function defineEntity<
    Events extends ChangeModel,
    Views extends ReadModel,
    Props extends Record<string, unknown>,
    Mutators extends (string & keyof Events)[],
    Dependencies extends (string & keyof Views)[],
>(
    type: Type<Props>,
    mutators: Mutators,
    dependencies: Dependencies,
    apply: EntityProjectionFunc<Pick<Events, Mutators[number]>, Pick<Views, Dependencies[number]>, Props>,
): EntityProjection<Props, Pick<Events, Mutators[number]>, Pick<Views, Dependencies[number]>> {
    return Object.freeze({
        kind: "entities",
        type,
        mutators: Object.freeze(new Set(mutators)),
        dependencies: Object.freeze(new Set(dependencies)),
        apply,
    });
}
