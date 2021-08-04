import { Predicate } from "paratype";
import { FilterSpec, OutputRecord } from "../driver";
import { _compileAccessor } from "./compile-accessor";
import { _compileOperator } from "./compile-operator";

/** @internal */
export const _compilePredicate = (spec: readonly FilterSpec[]): Predicate<OutputRecord> => spec.reduce(
    (prev, curr) => {
        const { path, operator, operand } = curr;
        const accessor = _compileAccessor(path);
        const op = _compileOperator(operator, operand);
        return record => prev(record) && op(accessor(record));
    },
    matchAll,
);

const matchAll: Predicate<OutputRecord> = () => true;
