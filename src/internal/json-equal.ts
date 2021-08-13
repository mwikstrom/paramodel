import deepEqual from "deep-equal";
import { JsonValue, Type } from "paratype";

/** @internal */
export const _jsonEqual = (actual: JsonValue, expected: JsonValue): boolean => deepEqual(
    actual, 
    expected,
    { strict: true }
);

/** @internal */
export const _typedJsonEqual = <T>(type: Type<T>, actual: T, expected: T): boolean => _jsonEqual(
    type.toJsonValue(actual),
    type.toJsonValue(expected)
);
