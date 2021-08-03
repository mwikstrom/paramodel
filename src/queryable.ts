/**
 * @public
 */
export interface Queryable<T> extends SortedQueryable<T> {
    by<P extends string & keyof SortableProps<T>>(
        this: void,
        property: P, 
        direction?: SortDirection,
    ): SortedQueryable<T>;
}

export type SortDirection = "ascending" | "descending";

/**
 * @public
 */
export interface SortedQueryable<T> {
    all(this: void): AsyncIterable<T>;
    any(this: void): Promise<boolean>;
    count(this: void): Promise<number>;
    first(this: void): Promise<T | undefined>;
    last(this: void): Promise<T | undefined>;
    page(this: void, options?: PageOptions): Promise<Page<T>>;
    reverse(this: void): SortedQueryable<T>;
    where<
        P extends string & keyof T,
        O extends FilterOperator<T[P]>,
    >(
        this: void,
        property: P,
        operator: O,
        operand: FilterOperand<T[P], O>,
    ): SortedQueryable<T>;
}

/**
 * @public
 */
export interface PageOptions {
    size?: number;
    continuation?: string;
}

/**
 * @public
 */
export interface Page<T> {
    readonly items: readonly T[];
    readonly continuation?: string;
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
export type SortableProps<T> = {
    [P in keyof T]: T[P] extends Comparable ? T[P] : never;
}

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
    "equals-ignore-case" |
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
