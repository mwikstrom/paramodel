import { TypeOf } from "paratype";
import { DomainModel } from "./model";

export interface ActionOptions {
    readonly dry: boolean;
    readonly signal: AbortSignal;
}

export type ActionResultType<
    Model extends Pick<DomainModel, "actions" | "events">,
    Action extends string & keyof Model["actions"],
> = (
    ActionResult<TypeOf<Model["actions"][Action]["output"]>>
);

export interface ActionResult<Output = unknown> {
    readonly timestamp: Date;
    readonly base: number;
    readonly status: "success" | "conflict" | "forbidden" | "aborted" | "rejected" | "failed";
    readonly message?: string;
    readonly output?: Output;
    readonly changes?: number;
    readonly committed?: number;
}
