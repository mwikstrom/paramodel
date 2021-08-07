import { OutputRecord, SortSpec } from "../driver";
import { _compareJson } from "./compare-json";
import { _compileAccessor } from "./compile-accessor";

/** @internal */
export const _compileComparison = (spec: SortSpec): _SortableComparison<OutputRecord> => {
    const { path, direction } = spec;
    const accessor = _compileAccessor(path);
    const ascending: _Comparison<OutputRecord> = (ra, rb) => {
        const va = accessor(ra);
        const vb = accessor(rb);
        return _compareJson(va, vb);
    };
    const compiled = direction !== "descending" ? ascending : invertComparison(ascending);
    return (a, b) => compiled(a, b) || 0;
};

/** @internal */
export type _SortableComparison<T> = (a: T, b: T) => -1 | 0 | 1;

/** @internal */
export type _Comparison<T> = (a: T, b: T) => -1 | 0 | 1 | undefined;

const invertComparison = <T>(original: _Comparison<T>): _Comparison<T> => (a, b) => {
    const inner = original(a, b);
    switch (inner) {
        case 1: return -1;
        case -1: return 1;
        default: return inner;
    }
};
