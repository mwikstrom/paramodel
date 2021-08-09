/**
 * A simple state snapshot
 * @public
 */
export interface StateView<T = unknown> {
    readonly kind: "state";
    readonly version: number;
    read(this: void): Promise<T>;
}
