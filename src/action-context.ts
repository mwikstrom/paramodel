import { TypeOf } from "paratype";
import { ChangeModel, ReadModel } from "./model";
import { ViewSnapshotFunc } from "./projection";

export interface ActionContext<
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Input = unknown,
    Output = unknown,
> {
    readonly version: number;
    readonly timestamp: Date;
    readonly input: Input;
    readonly scope: Scope;
    forbidden(message?: string): never;
    conflict(message?: string): never;
    output(result: Output): void;
    emit<K extends string & keyof Events>(key: K, arg: TypeOf<Events[K]>): void;
    view: ViewSnapshotFunc<Views>;
}
