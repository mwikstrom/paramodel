import { TypeOf } from "paratype";
import { Change, ChangeType } from "./change";
import { DomainModel } from "./model";

export interface ActionOptions {
    readonly dry: boolean;
    readonly signal: AbortSignal;
}

export type ActionResultType<
    Model extends Pick<DomainModel, "actions" | "events">,
    Action extends string & keyof Model["actions"],
> = (
    ActionResult<ChangeType<Model["events"]>, TypeOf<Model["actions"][Action]["output"]>>
);

export interface ActionResult<ChangeType = Change, Output = unknown> {
    readonly timestamp: Date;
    readonly base: number;
    readonly status: "success" | "conflict" | "forbidden";
    readonly changes: readonly ChangeType[];
    readonly committed?: number;
    readonly message?: string;
    readonly output?: Output;
}
