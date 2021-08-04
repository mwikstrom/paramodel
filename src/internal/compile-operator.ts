import { JsonValue, Predicate } from "paratype";
import { _isOperator } from "./is-operator";

/** @internal */
export const _compileOperator = (
    operator: string, 
    operand: JsonValue
): Predicate<JsonValue | undefined> => {
    const inverted = INVERTED_OPERATOR_PATTERN.test(operator);
    
    if (inverted) {
        operator = operator.replace(INVERTED_OPERATOR_PATTERN, "");
    }

    if (typeof operator !== "string" || !(operator in factory)) {
        return matchNone;
    }

    const compiled = factory[operator](operand);
    return inverted ? value => !compiled(value) : compiled;
};

const INVERTED_OPERATOR_PATTERN = /(^not-)|(-not)$/;
const matchNone = () => false;

const inOperator = (operand: JsonValue): Predicate<JsonValue | undefined> => {
    if (Array.isArray(operand)) {
        return value => value !== void(0) && operand.includes(value);
    } else {
        return matchNone;
    }
};

const includesOperator = (operand: JsonValue): Predicate<JsonValue | undefined> => value => (
    Array.isArray(value) &&
    value.includes(operand)
);

const includesAnyOperator = (operand: JsonValue): Predicate<JsonValue | undefined> => {
    if (Array.isArray(operand)) {
        return value => Array.isArray(value) && operand.some(item => value.includes(item));
    } else {
        return matchNone;
    }
};

const factory: Record<string, (operand: JsonValue) => Predicate<JsonValue | undefined>> = {
    // TODO: ==
    // TODO: !=
    // TODO: >=
    // TODO: <=
    // TODO: >
    // TODO: <
    in: inOperator,
    includes: includesOperator,
    "includes-any": includesAnyOperator,
    is: _isOperator,
    // TODO: equals-ignore-case
    // TODO: contains
    // TODO: contains-ignore-case
    // TODO: starts-with
    // TODO: starts-with-ignore-case
    // TODO: ends-with
    // TODO: ends-with-ignore-case
};
