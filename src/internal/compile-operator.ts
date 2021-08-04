import { JsonValue, Predicate } from "paratype";

/** @internal */
export const _compileOperator = (
    operator: string, 
    operand: JsonValue
): Predicate<JsonValue | undefined> => {
    const inverted = INVERTED_OPERATOR_PATTERN.test(operator);
    
    if (inverted) {
        operator = operator.replace(INVERTED_OPERATOR_PATTERN, "");
    }

    if (typeof operator !== "string" || !(operator in operatorFactories)) {
        return matchNone;
    }

    const compiled = operatorFactories[operator](operand);
    return inverted ? value => !compiled(value) : compiled;
};

const INVERTED_OPERATOR_PATTERN = /(^not-)|(-not)$/;
const matchNone = () => false;

const isOperator = (operand: JsonValue): Predicate<JsonValue | undefined> => {
    if (typeof operand === "string" && operand in isOperatorsByOperand) {
        return isOperatorsByOperand[operand];
    } else {
        return matchNone;
    }
};

const inOperator = (operand: JsonValue): Predicate<JsonValue | undefined> => {
    if (Array.isArray(operand)) {
        return value => value !== void(0) && operand.includes(value);
    } else {
        return matchNone;
    }
};

const operatorFactories: Record<string, (operand: JsonValue) => Predicate<JsonValue | undefined>> = {
    // TODO: ==
    // TODO: !=
    // TODO: >=
    // TODO: <=
    // TODO: >
    // TODO: <
    in: inOperator,
    // TODO: includes
    // TODO: includes-any
    is: isOperator,
    // TODO: equals-ignore-case
    // TODO: contains
    // TODO: contains-ignore-case
    // TODO: starts-with
    // TODO: starts-with-ignore-case
    // TODO: ends-with
    // TODO: ends-with-ignore-case
};

const isOperatorsByOperand: Record<string, Predicate<JsonValue | undefined>> = {
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
