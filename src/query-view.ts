import { Forbidden } from "./model";

export interface QueryView<P = unknown, T = unknown> {
    readonly kind: "query";
    readonly version: number;
    query(params: P): Promise<T | Forbidden>;
}
