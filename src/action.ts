import { TypeOf } from "paratype";
import { ChangeType } from "./change";
import { ChangeModel, DomainModel } from "./model";

export interface ActionOptions {
    readonly dry: boolean;
    readonly signal: AbortSignal;
}

export type ActionResultType<
    Model extends Pick<DomainModel, "actions" | "events">,
    Action extends string & keyof Model["actions"],
> = (
    ActionResult<Model["events"], TypeOf<Model["actions"][Action]["output"]>>
);

export interface ActionResult<Events extends ChangeModel, Output> {
    readonly timestamp: Date;
    readonly base: number;
    readonly status: "success" | "conflict" | "forbidden";
    readonly changes: readonly ChangeType<Events>[];
    readonly committed?: number;
    readonly message?: string;
    readonly output?: Output;
}
