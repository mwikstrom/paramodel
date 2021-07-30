/**
 * @public
 */
export interface Queryable<T> {
    any(): Promise<boolean>;
    count(): Promise<number>;
    orderBy<P extends keyof T>(property: P): Queryable<T>;
    top(count: number): Promise<readonly T[]>;
    where<
        P extends string & keyof T,
        O extends FilterOperator<T[P]>,
    >(
        property: P,
        operator: O,
        operand: FilterOperand<T[P], O>,
    ): Queryable<T>;
    // TODO: Support nested filter (stepping into record property)
    // TODO: Support subquery filter (stepping into array)
}

/**
 * @public
 */
export type FilterOperator<T> = (
    (IsOperand<T> extends never ? never : IsOperator) |
    (T extends Equatable ? EqualityOperator : never) |
    (T extends Comparable ? ComparisonOperator : never) |
    (T extends unknown[] ? ArrayOperator : never) |
    (T extends string ? StringOperator : never)
);

/**
 * @public
 */
export type FilterOperand<T, O> = (
    O extends IsOperator ? IsOperand<T> :
    O extends EqualityOperator ? T :
    O extends ComparisonOperator ? T :
    O extends ArrayAnyOperator ? T :
    O extends ArrayOperator ? T extends unknown[infer E] ? E : never :
    O extends StringOperator ? string : never
);
/**
 * @public
 */

export type Equatable = null | boolean | Comparable;

/**
 * @public
 */
export type Comparable = number | string | Date;

/**
 * @public
 */
export type IsOperator = "is" | "is-not";

/**
 * @public
 */
export type EqualityOperator = "==" | "!=" | "in" | "not-in";

/**
 * @public
 */
export type ComparisonOperator = ">" | ">=" | "<" | "<=";

/**
 * @public
 */
export type ArrayOperator = (
    "includes" | 
    "not-includes" | 
    ArrayAnyOperator
);

/**
 * @public
 */
export type ArrayAnyOperator = (
    "includes-any" | 
    "not-includes-any"
);

/**
 * @public
 */
export type StringOperator = (
    "contains" |
    "contains-ignore-case" |
    "starts-with" |
    "starts-with-ignore-case" |
    "ends-with" |
    "ends-with-ignore-case"
);

/**
 * @public
 */
export type IsOperand<T> = (
    (T extends undefined ? "defined" : never) |
    (T extends null ? "null" | "scalar" : never) |
    (T extends boolean ? "boolean" | "scalar" : never) |
    (T extends number ? "number" | "scalar" : never) |
    (T extends string ? "string" | "scalar" : never) |
    (T extends unknown[] ? "array" : never) |
    (T extends Record<string, unknown> ? "object" : never)
);
