import { TypeOf } from "paratype";
import { ChangeModel } from "./model";

export type ChangeType<Model extends ChangeModel> = {
    [K in keyof Model]: K extends string ? Change<K, TypeOf<Model[K]>> : never;
}[keyof Model];

export interface Change<K extends string = string, T = unknown> {
    readonly version: number;
    readonly offset: number;
    readonly timestamp: Date;
    readonly key: K;
    readonly arg: T;
}
