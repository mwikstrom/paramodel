import escapeRegex from "escape-string-regexp";
import { JsonValue, Predicate } from "paratype";
import { _compareJson } from "./compare-json";
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

    if (typeof operator !== "string" || !(operator in factories)) {
        return matchNone;
    }

    let compiled = factories[operator](operand);
    if (inverted) {
        compiled = invertOperator(compiled);
    }
    return value => compiled(value) === true;
};

const INVERTED_OPERATOR_PATTERN = /(^not-)|(-not)$/;
const matchNone = () => false;

const _in: OpFactory = operand => {
    if (Array.isArray(operand)) {
        return value => value !== void(0) && operand.includes(value);
    } else {
        return matchNone;
    }
};

const includes: OpFactory = operand => value => (
    Array.isArray(value) &&
    value.includes(operand)
);

const includesAny: OpFactory = operand => {
    if (Array.isArray(operand)) {
        return value => Array.isArray(value) && operand.some(item => value.includes(item));
    } else {
        return matchNone;
    }
};

const eq: OpFactory = operand => value => value === operand;

const gt: OpFactory = operand => value => {
    const cmp = _compareJson(value, operand);
    return cmp === void(0) ? cmp : cmp > 0;
};

const lt: OpFactory = operand => value => {
    const cmp = _compareJson(value, operand);
    return cmp === void(0) ? cmp : cmp < 0;
};


const regexOperator = (pattern: RegExp): Predicate<JsonValue | undefined> => value => (
    typeof value === "string" && 
    pattern.test(value)
);

const regexOperatorFactory = (format: (operand: string) => string, flags?: string): OpFactory => operand => (
    typeof operand === "string" ? regexOperator(new RegExp(format(escapeRegex(operand)), flags)) : matchNone
);

const equalsIgnoreCase: OpFactory = regexOperatorFactory(operand => `^${operand}$`, "i");
const contains: OpFactory = regexOperatorFactory(operand => operand);
const containsIgnoreCase: OpFactory = regexOperatorFactory(operand => operand, "i");
const startsWith: OpFactory = regexOperatorFactory(operand => `^${operand}`);
const startsWithIgnoreCase: OpFactory = regexOperatorFactory(operand => `^${operand}`, "i");
const endsWith: OpFactory = regexOperatorFactory(operand => `${operand}$`);
const endsWithIgnoreCase: OpFactory = regexOperatorFactory(operand => `${operand}$`, "i");

const invertOperator = (
    inner: Op
): Op => value => {
    const v = inner(value);
    return v === void(0) ? v : !v;
};

const invertFactory = (inner: OpFactory): OpFactory => operand => invertOperator(inner(operand));

type Op = (value: JsonValue | undefined) => boolean | undefined;
type OpFactory = (operand: JsonValue) => Op;

const factories: Record<string, OpFactory> = {
    "==": eq,
    "!=": invertFactory(eq),
    ">=": invertFactory(lt),
    "<=": invertFactory(gt),
    ">": gt,
    "<": lt,
    "in": _in,
    "includes": includes,
    "includes-any": includesAny,
    "is": _isOperator,
    "equals-ignore-case": equalsIgnoreCase,
    "contains": contains,
    "contains-ignore-case": containsIgnoreCase,
    "starts-with": startsWith,
    "starts-with-ignore-case": startsWithIgnoreCase,
    "ends-with": endsWith,
    "ends-with-ignore-case": endsWithIgnoreCase,
};