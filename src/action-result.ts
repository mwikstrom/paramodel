import { TypeOf } from "paratype";
import { DomainModel } from "./model";

/**
 * The result of executing an action
 * @public
 */
export interface ActionResult<Output = unknown> {
    /** Timestamp when the action was executed */
    readonly timestamp: Date;

    /** Commit version at which the action was executed */
    readonly base: number;

    /** Resulting status of the action */
    readonly status: ActionResultStatus;

    /** A message emitted by the action, or `undefined` when the action handler didn't provide a result message */
    readonly message?: string;

    /** Output from executing the action, or `undefined` when the action handler didn't provide a result */
    readonly output?: Output;

    /**
     * The number of change events that were emitted by the action handler,
     * or `undefined` when the action wasn't successful
     */
    readonly changes?: number;

    /**
     * The version that was committed by the action, or `undefined` when the action wasn't successful or
     * run with the {@link ActionOptions.dry} option */
    readonly committed?: number;
}

/**
 * Type alias for the result type of an action
 * @public
 */
export type ActionResultType<
    Model extends Pick<DomainModel, "actions" | "events">,
    Action extends string & keyof Model["actions"],
> = (
    ActionResult<TypeOf<Model["actions"][Action]["output"]>>
);

/**
 * Defines the action result status codes:
 * 
 * - `success`: The action completed successfully
 * 
 * - `conflict`: A conflict prevented the action from completing successfully
 * 
 * - `forbidden`: The active domain scope was not permitted to execute the action
 * 
 * - `aborted`: The action was aborted
 * 
 * - `rejected`: The action was rejected due to bad input
 * 
 * - `failed`: The action failed to execute
 * 
 * @public
 */
export type ActionResultStatus = (
    "success" | 
    "conflict" | 
    "forbidden" | 
    "aborted" | 
    "rejected" | 
    "failed"
);