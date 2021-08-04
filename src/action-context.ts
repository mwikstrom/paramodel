import { TypeOf } from "paratype";
import { ChangeModel, ReadModel } from "./model";
import { ViewSnapshotFunc } from "./projection";

export interface ActionContext<
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Scope = unknown,
    Input = unknown,
    Output = unknown,
> {
    readonly version: number;
    readonly timestamp: Date;
    readonly input: Input;
    readonly scope: Scope;
    forbidden(this: void, message?: string): never;
    conflict(this: void, message?: string): never;
    output(this: void, result: Output): void;
    emit<K extends string & keyof Events>(this: void, key: K, arg: TypeOf<Events[K]>): void;
    view: ViewSnapshotFunc<Views>;
}
