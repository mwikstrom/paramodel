/**
 * A queryable collection
 * @public
 */
export interface Queryable<T> {
    all(this: void): AsyncIterable<T>;
    any(this: void): Promise<boolean>;
    by<P extends string & keyof SortableProps<T>>(
        this: void,
        property: P, 
        direction?: SortDirection,
    ): Queryable<T>;
    count(this: void): Promise<number>;
    first(this: void): Promise<T | undefined>;
    page(this: void, options?: PageOptions): Promise<Page<T>>;
    where<
        P extends string & keyof T,
        O extends FilterOperator<T[P]>,
    >(
        this: void,
        property: P,
        operator: O,
        operand: FilterOperand<T[P], O>,
    ): Queryable<T>;
}

/**
 * Sort direction
 * @public
 */
export type SortDirection = "ascending" | "descending";

/**
 * Options for getting a page
 * @public
 */
export interface PageOptions {
    /**
     * The desired number of items to be returned.
     * 
     * This is only a hint, more or fewer (even zero) items may be returned.
     * You must be prepared to handle continuation tokens to iterate over all
     * items.
     */
    size?: number;

    /** Optional continuation token as returned in the previous page */
    continuation?: string;
}

/**
 * A page of items
 * @public
 */
export interface Page<T> {
    /**
     * Items returned on the current page.
     * 
     * Notice that this may be an empty array even though there are more
     * items. You must be prepared to handle continuation tokens to iterate over
     * all items.
     */
    readonly items: readonly T[];

    /**
     * An opaque continuation token that provides access to the next page,
     * or `undefined` when there are no more items.
     */
    readonly continuation?: string;
}

/**
 * A type alias that represents a filter operator for a given property type
 * @public
 */
export type FilterOperator<T> = (
    (IsOperand<T> extends never ? never : IsOperator) |
    (T extends Equatable ? EqualityOperator : never) |
    (T extends Comparable ? ComparisonOperator : never) |
    (T extends readonly unknown[] ? ArrayOperator : never) |
    (T extends string ? StringOperator : never)
);

/**
 * A type alias that represents a filter operand for a given property type and operator
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
 * Represents equatable property types
 * @public
 */
export type Equatable = null | boolean | Comparable;

/**
 * Represents comparable property types
 * @public
 */
export type Comparable = number | string | Date;

/**
 * Extracts sortable properties
 * @public
 */
export type SortableProps<T> = {
    [P in keyof T]: T[P] extends Comparable ? T[P] : never;
}

/**
 * Defines the type checking operators
 * @public
 */
export type IsOperator = "is" | "is-not";

/**
 * Defines the equality operators
 * @public
 */
export type EqualityOperator = "==" | "!=" | "in" | "not-in";

/**
 * Defines the comparison operators
 * @public
 */
export type ComparisonOperator = ">" | ">=" | "<" | "<=";

/**
 * Defines the array operators
 * @public
 */
export type ArrayOperator = (
    "includes" | 
    "not-includes" | 
    ArrayAnyOperator
);

/**
 * Defines array operators that require an array operand
 * @public
 */
export type ArrayAnyOperator = (
    "includes-any" | 
    "not-includes-any"
);

/**
 * Defines the string operators
 * @public
 */
export type StringOperator = (
    "equals-ignore-case" |
    "contains" |
    "contains-ignore-case" |
    "starts-with" |
    "starts-with-ignore-case" |
    "ends-with" |
    "ends-with-ignore-case" |
    "not-equals-ignore-case" |
    "not-contains" |
    "not-contains-ignore-case" |
    "not-starts-with" |
    "not-starts-with-ignore-case" |
    "not-ends-with" |
    "not-ends-with-ignore-case"
);

/**
 * Defines the type checking operands
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
