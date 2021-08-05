export interface StateView<T = unknown> {
    readonly kind: "state";
    readonly version: number;
    auth(this: void): Promise<boolean>;
    read(this: void): Promise<T>;
}
