import { JsonValue } from "paratype";
import { _Comparison } from "./compile-comparison";

/** @internal */
export const _compareJson: _Comparison<JsonValue | undefined> = (a, b): -1 | 0 | 1 => {
    const ka = scalarTypeSortKey(a);
    const kb = scalarTypeSortKey(b);

    if (ka === void(0) || kb === void(0)) {
        // note: they're really not comparable - but returning zero is the
        // least bad thing since it should at least preserve internal sort order
        return 0;
    }

    if (ka < kb) {
        return -1;
    }

    if (ka > kb) {
        return 1;
    }

    // type assertions are known since they have the same scalar sort key
    const va = a as string | number;
    const vb = a as typeof va;
    
    if (va < vb) {
        return -1;
    }

    if (va > vb) {
        return 1;
    }

    return 0;
};

const scalarTypeSortKey = (value: unknown): 0 | 1 | 2 | 3 | 4 | undefined => {
    if (value === null) {
        return 0;
    }

    switch (typeof value) {
        case "boolean": return value ? 2 : 1;
        case "number": return 3;
        case "string": return 4;
        default: return void(0);
    }
};
