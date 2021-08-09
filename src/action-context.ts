import { TypeOf } from "paratype";
import { ChangeModel, Conflict, Forbidden, ReadModel } from "./model";
import { ViewSnapshotFunc } from "./projection";

/**
 * The context in which an action is executed
 * @public
 */
export interface ActionContext<
    Events extends ChangeModel = ChangeModel,
    Views extends ReadModel = ReadModel,
    Scope = unknown,
    Input = unknown,
    Output = unknown,
> {
    /**
     * The version number that will be committed in case the action succeeds
     */
    readonly version: number;

    /**
     * The current timestamp when the action is being executed
     */
    readonly timestamp: Date;

    /**
     * The action input data
     */
    readonly input: Input;

    /**
     * The domain scope under which the action is being executed
     */
    readonly scope: Scope;

    /**
     * Marks the current action as forbidden if it is not previosuly marked as unsuccessful.
     * @param this - <i>(Ignored)</i> This method uses implicit `this` binding
     * @param message - <i>(Optional)</i> Message to be exposed in action's result
     */
    forbidden(this: void, message?: string): Forbidden;

    /**
     * Marks the current action as conflicting if it is not previosuly marked as unsuccessful.
     * @param this - <i>(Ignored)</i> This method uses implicit `this` binding
     * @param message - <i>(Optional)</i> Message to be exposed in action's result
     */
    conflict(this: void, message?: string): Conflict;

    /**
     * Sets the ouput value of the current action
     * @param this - <i>(Ignored)</i> This method uses implicit `this` binding
     * @param result - The output value
     */
    output(this: void, result: Output): void;

    /**
     * Emits a change event from the current action.
     * @param this - <i>(Ignored)</i> This method uses implicit `this` binding
     * @param key - Event key
     * @param arg - Event arg
     */
    emit<K extends string & keyof Events>(this: void, key: K, arg: TypeOf<Events[K]>): void;

    /**
     * Gets a view snapshot that expose state as it were just before the current action was executed.
     * @param this - <i>(Ignored)</i> This method uses implicit `this` binding
     * @param key - Identifies the view to get
     * @param options - <i>(Optional)</i> View options
     */
    view: ViewSnapshotFunc<Views>;
}
