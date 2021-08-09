import { Type, voidType } from "paratype";
import { ActionFunc, ActionHandler } from "./action-handler";
import { ChangeModel, ReadModel } from "./model";

/**
 * Creates an {@link ActionHandler}
 * @param this - <i>(Ignored)</i> This function uses implicit `this` binding
 * @param input - Type of action input
 * @param exec - The action handler executor
 * @param dependencies - <i>(Optional)</i> A set of view keys that the action depends upon during execution.
 * These views will automatically be synced to the current version just before the
 * action the executed and available via the {@link ActionContext.view} function.
 * @param output - <i>(Optional)</i> Type of action output
 * 
 * @public
 */
export function defineAction<
    Input,
    Output,
    Scope = unknown,
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Dependencies extends (string & keyof Views)[] = [],
>(
    this: void,
    input: Type<Input>,
    exec: ActionFunc<Events, Pick<Views, Dependencies[number]>, Scope, Input, Output>,
    dependencies?: Dependencies,
    output?: Type<Output>,
): ActionHandler<Events, Pick<Views, Dependencies[number]>, Scope, Input, Output> {
    return Object.freeze({
        input,
        output: (output || voidType) as Type<Output>,
        dependencies: Object.freeze(new Set(dependencies || [])),
        exec,
    });
}
