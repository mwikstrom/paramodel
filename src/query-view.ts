/**
 * A query snapshot
 * @public
 */
export interface QueryView<P = unknown, T = unknown> {
    readonly kind: "query";
    readonly version: number;
    query(this: void, params: P): Promise<T>;
}
