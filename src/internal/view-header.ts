import { enumType, nonNegativeIntegerType, recordType, Type } from "paratype";

/** @internal */
export type _ViewHeader = {
    readonly sync: number;
    readonly clean: number;
    readonly kind: "state" | "entities";
};

/** @internal */
export const _viewHeader: Type<_ViewHeader> = recordType({
    sync: nonNegativeIntegerType,
    clean: nonNegativeIntegerType,
    kind: enumType(["state", "entities"]),
});
