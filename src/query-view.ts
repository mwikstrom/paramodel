export interface QueryView<P = unknown, T = unknown> {
    readonly kind: "query";
    readonly version: number;
    auth(this: void, params: P): Promise<boolean>;
    query(this: void, params: P): Promise<T>;
}
