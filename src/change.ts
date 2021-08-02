import { TypeOf } from "paratype";
import { ChangeModel } from "./model";

export type ChangeType<Model extends ChangeModel> = {
    [K in keyof Model]: K extends string ? Change<TypeOf<Model[K]>, K> : never;
}[keyof Model];

export interface Change<T = unknown, K extends string = string> {
    readonly version: number;
    readonly offset: number;
    readonly timestamp: Date;
    readonly key: K;
    readonly arg: T;
}
