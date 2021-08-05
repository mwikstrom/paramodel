import { enumType, nonNegativeIntegerType, recordType, stringType, timestampType, Type } from "paratype";

/** @internal */
export type _ViewHeader = {
    readonly version: number;
    readonly position: number;
    readonly timestamp: Date;
    readonly clean: number;
    readonly error: string;
    readonly kind: "state" | "entities" | "query";
};

/** @internal */
export const _viewHeader: Type<_ViewHeader> = recordType({
    version: nonNegativeIntegerType,
    position: nonNegativeIntegerType,
    timestamp: timestampType,
    clean: nonNegativeIntegerType,
    error: stringType,
    kind: enumType(["state", "entities", "query"]),
});
