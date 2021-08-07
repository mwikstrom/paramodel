import { _compileOperator } from "../src/internal/compile-operator";

describe("compiled-operator", () => {
    const trueCases = [
        [null, "==", null],
        [true, "==", true],
        [123, "==", 123],
        ["x", "==", "x"],
        [{}, "!=", {}],
        ["123", "!=", 123],
        [[], "!=", []],
        [1, "<", 2],
        [1, "<=", 2],
        [1, "<=", 1],
        [1, ">=", 1],
        [2, ">=", 1],
        [2, ">", 1],
        [null, "<=", null],
        [null, ">=", null],
        [false, ">", null],
        [false, "<", true],
        [true, "<", -1],
        [0, ">", -1],
        [1, "<", "1"],
        ["2", ">", "1"],
        ["a", "in", ["a"]],
        ["a", "not-in", ["b"]],
        [["a"], "includes", "a"],
        [["b"], "not-includes", "a"],
        [["a"], "includes-any", ["x", "a"]],
        [["b"], "not-includes-any", ["x", "a"]],
        [null, "is", "null"],
        [null, "is", "scalar"],
        [null, "is", "defined"],
        [void(0), "is-not", "defined"],
        [123, "is", "number"],
        [123, "is", "scalar"],
        [true, "is", "boolean"],
        [true, "is", "scalar"],
        [false, "is", "defined"],
        ["a", "is", "string"],
        ["a", "is", "scalar"],
        ["1", "is-not", "number"],
        [[], "is", "array"],
        [[], "is-not", "scalar"],
        [{}, "is", "object"],
        [{}, "is-not", "scalar"],
        ["abc", "!=", "ABC"],
        ["abc", "equals-ignore-case", "ABC"],
        ["abc", "not-equals-ignore-case", "AXC"],
        ["abc", "contains", "b"],
        ["abc", "not-contains", "x"],
        ["abc", "contains-ignore-case", "B"],
        ["abc", "starts-with", "ab"],
        ["abc", "starts-with", ""],
        ["abc", "ends-with", ""],
        ["abc", "contains", ""],
        ["aBc", "starts-with-ignore-case", "AB"],
        ["abc", "ends-with", "bc"],
        ["aBC", "ends-with-ignore-case", "Bc"],
        ["abc", "not-contains-ignore-case", "aC"],
        ["abc", "not-starts-with", "Ab"],
        ["aBc", "not-starts-with-ignore-case", "B"],
        ["abc", "not-ends-with", "bC"],
        ["aBC", "not-ends-with-ignore-case", "B"],
        [undefined, "==", undefined],
        [undefined, "!=", 1],
    ];

    for (const [value, operator, operand] of trueCases) {
        it(`${JSON.stringify(value)} ${operator} ${JSON.stringify(operand)} evaluates to true`, () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const op = _compileOperator(operator as string, operand as any);
            expect(op(value)).toBe(true);
        });
    }

    const falseCases = [
        [undefined, "<", 1],
        [1, ">", undefined],
    ];

    for (const [value, operator, operand] of falseCases) {
        it(`${JSON.stringify(value)} ${operator} ${JSON.stringify(operand)} evaluates to false`, () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const op = _compileOperator(operator as string, operand as any);
            expect(op(value)).toBe(false);
        });
    }
});