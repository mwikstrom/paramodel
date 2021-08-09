/**
 * Options for executing an action
 * @public
 */
export interface ActionOptions {
    /**
     * Optional. When `true` causes the action to be performed as normal but its effect is
     * **NOT** committed.
     */
    dry?: boolean;

    /** Optional. An abort signal that shall be observed while executing the action. */
    signal?: AbortSignal;
}
