import { Predicate } from "paratype";
import { FilterSpec, OutputRecord, SortSpec } from "../driver";

/** @internal */
export const _compilePredicate = (spec: readonly FilterSpec[]): Predicate<OutputRecord> => {
    throw new Error("TODO: Method not implemented.");
};

/** @internal */
export const _compileComparer = (spec: SortSpec): _Comparison<OutputRecord> => {
    throw new Error("TODO: Method not implemented.");
};

/** @internal */
export type _Comparison<T> = (a: T, b: T) => -1 | 0 | 1;
