import { Type } from "paratype";
import { ActionFunc, ActionHandler } from "./action-handler";
import { ChangeModel, ReadModel } from "./model";

export function defineAction<
    Events extends ChangeModel,
    Views extends ReadModel,
    Scope,
    Input,
    Output,
    Dependencies extends (string & keyof Views)[],
>(
    input: Type<Input>,
    output: Type<Output>,
    dependencies: Dependencies,
    exec: ActionFunc<Events, Pick<Views, Dependencies[number]>, Scope, Input, Output>,
): ActionHandler<Events, Pick<Views, Dependencies[number]>, Scope, Input, Output> {
    return Object.freeze({
        input,
        output,
        dependencies: Object.freeze(new Set(dependencies)),
        exec,
    });
}