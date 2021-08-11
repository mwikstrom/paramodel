import { TypeOf } from "paratype";
import { ChangeModel, Conflict, Forbidden, ReadModel } from "./model";
import { PiiString } from "./pii";
import { ViewOf } from "./projection";
import { ViewOptions } from "./store";

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
     * Protects the specified personally identifiable information (PII)
     * @param this - <i>(Ignored)</i> This method uses implicit `this` binding
     * @param scope - Scope of the PII
     * @param value - The value to be protected
     * @param obfuscated - <i>(Optional)</i> An obfuscated value to be exposed after the PII scope is shredded
     */
    pii(this: void, scope: string, value: string, obfuscated?: string): Promise<PiiString>;

    /**
     * Registers that the specified PII scope shall be shredded when the current action
     * is successfully committed and the store is purged up to the committed version.
     * @param this - <i>(Ignored)</i> This method uses implicit `this` binding
     * @param scope- The PII scope that shall be shredded
     */
    shred(this: void, scope: string): void;

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
    view<K extends string & keyof Views>(
        this: void,
        key: K,
        options?: Partial<Pick<ViewOptions, "auth">>,
    ): Promise<ViewOf<Views[K]>>;    
}
