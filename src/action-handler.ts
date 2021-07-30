import { Type } from "paratype";
import { ActionContext } from "./action-context";
import { ChangeModel, ReadModel } from "./model";

export interface ActionHandler<
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Input = unknown,
    Output = unknown,
> {
    readonly input: Type<Input>;
    readonly output: Type<Output>;
    readonly dependencies: ReadonlySet<string & keyof Views>;
    readonly exec: ActionFunc<Events, Views, Input, Output>;
}

export type ActionFunc<
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Input = unknown,
    Output = unknown,
> = (context: ActionContext<Events, Views, Input, Output>) => Promise<void>;
