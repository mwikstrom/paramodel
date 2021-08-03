import { Type, voidType } from "paratype";
import { ActionFunc, ActionHandler } from "./action-handler";
import { ChangeModel, ReadModel } from "./model";

export function defineAction<
    Input,
    Output,
    Scope = unknown,
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Dependencies extends (string & keyof Views)[] = [],
>(
    input: Type<Input>,
    exec: ActionFunc<Events, Pick<Views, Dependencies[number]>, Scope, Input, Output>,
    dependencies: Dependencies = [] as any,
    output: Type<Output> = voidType as any,
): ActionHandler<Events, Pick<Views, Dependencies[number]>, Scope, Input, Output> {
    return Object.freeze({
        input,
        output,
        dependencies: Object.freeze(new Set(dependencies)),
        exec,
    });
}
