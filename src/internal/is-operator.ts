import { JsonValue, Predicate } from "paratype";

/** @internal */
export const _isOperator = (operand: JsonValue): Predicate<JsonValue | undefined> => {
    if (typeof operand === "string" && operand in byOperand) {
        return byOperand[operand];
    } else {
        return matchNone;
    }
};

const matchNone = () => false;

const byOperand: Record<string, Predicate<JsonValue | undefined>> = {
    defined: value => value !== void(0),
    null: value => value === null,
    boolean: value => typeof value === "boolean",
    number: value => typeof value === "number",
    string: value => typeof value === "string",
    scalar: value => isScalar(value),
    array: value => Array.isArray(value),
    object: value => value !== null && !Array.isArray(value) && typeof value === "object",
};

const isScalar = (value: unknown): boolean => (
    value === null ||
    ["boolean", "number", "string"].includes(typeof value)
);
