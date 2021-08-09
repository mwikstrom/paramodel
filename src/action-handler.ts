import { Type } from "paratype";
import { ActionContext } from "./action-context";
import { ChangeModel, Conflict, Forbidden, ReadModel } from "./model";

/**
 * A domain action handler
 * @public
 */
export interface ActionHandler<
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Scope = unknown,
    Input = unknown,
    Output = unknown,
> {
    /** Type of input that the action requires */
    readonly input: Type<Input>;

    /** Type of output that the action provides */
    readonly output: Type<Output>;

    /**
     * A set of view keys that the action depend upon during execution.
     * These views will automatically be synced to the current version just before the
     * action the executed and available via the {@link ActionContext.view} function.
     */
    readonly dependencies: ReadonlySet<string & keyof Views>;

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

/**
 * Type alias that matches any {@link ActionHandler}
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyActionHandler = ActionHandler<any, any, any, any, any>;

/**
 * Type alias that matches the {@link ActionHandler.exec} function
 * @public
 */
export type ActionFunc<
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Scope = unknown,
    Input = unknown,
    Output = unknown,
> = ActionHandler<Events, Views, Scope, Input, Output>["exec"];
