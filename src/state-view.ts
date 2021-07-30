export interface StateView<T = unknown> {
    readonly kind: "state";
    readonly version: number;
    read(): Promise<T>;
}
