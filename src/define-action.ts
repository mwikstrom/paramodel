import { Type, voidType } from "paratype";
import { ActionContext } from "./action-context";
import { ActionHandler } from "./action-handler";
import { ChangeModel, Conflict, Forbidden, ReadModel } from "./model";

/**
 * Creates an {@link ActionHandler}
 * @param this - <i>(Ignored)</i> This function uses implicit `this` binding
 * @param definition - Action definition
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
    definition: ActionDefinition<Input, Output, Scope, Events, Views, Dependencies>,
): ActionHandler<Events, Pick<Views, Dependencies[number]>, Scope, Input, Output> {
    const { 
        input,
        output = voidType as unknown as Type<Output>,
        dependencies: dependencyArray,
        exec
    } = definition;
    const dependencies = Object.freeze(new Set(dependencyArray || []));
    return Object.freeze({ input, output, dependencies, exec });
}

/**
 * Settings that define an action
 * @public
 */
export interface ActionDefinition<
    Input,
    Output,
    Scope = unknown,
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Dependencies extends (string & keyof Views)[] = [],
> {
    /** Action input type */
    input: Type<Input>;
    
    /**
     * Optional array of vies keys that the action depends upon during execution.
     * 
     * These views will automatically be synced to the current version just before the
     * action is executed and are made available via the {@link ActionContext.view} function.
     */
    dependencies?: Dependencies;

    /** Optional action output type */
    output?: Type<Output>;

    /**
     * Executes the defined action
     * @param this - <i>(Ignored)</i> This method uses implicit `this` binding
     * @param context - The {@link ActionContext} in which the action is executed
     */
     exec(
        this: void,
        context: ActionContext<Events, Views, Scope, Input, Output>
    ): Promise<Forbidden | Conflict | void>
}
