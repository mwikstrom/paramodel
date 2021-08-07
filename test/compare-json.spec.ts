import { _compareJson } from "../src/internal/compare-json";

describe("compare-json", () => {
    const cases = [
        [1, 1, 0],
        [0, 1, -1],
        [1, 0, 1],
        [false, false, 0],
        [false, true, -1],
        [false, null, 1],
        ["1", "2", -1],
        ["1", 2, 1],
        ["1", "1", 0],
        [undefined, undefined, undefined],
        [1, undefined, undefined],
        [undefined, 0, undefined],
        [[], 1, undefined],
        [{}, 1, undefined],
    ];

    for (const [a, b, r] of cases) {
        it(`comparing ${JSON.stringify(a)} with ${JSON.stringify(b)} results in ${r}`, () => {
            expect(_compareJson(a, b)).toBe(r);
        });
    }
});