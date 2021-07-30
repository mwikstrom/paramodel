import { TypeOf } from "paratype";
import { ChangeType } from "./change";
import { DomainModel, ChangeModel } from "./model";
import { ViewOf } from "./projection";
import { SortedQueryable } from "./queryable";

export interface DomainStore<Model extends DomainModel> {
    readonly changes: SortedQueryable<ChangeType<Model["events"]>>;
    do<K extends string & keyof Model["actions"]>(
        key: K,
        input: TypeOf<Model["actions"][K]["input"]>,
        options?: ActionOptions,
    ): Promise<ActionResultType<Model, K>>;
    view<K extends string & keyof Model["views"]>(
        key: K,
        options?: ViewOptions
    ): Promise<ViewOf<Model["views"][K]> | undefined>;
}

export interface ActionOptions {
    dry?: boolean;
}

export interface ViewOptions<T extends number | undefined = undefined> {
    readonly version?: T;
    readonly align?: VersionAlignment<T>;
}

export type VersionAlignment<T> = (
    T extends number ? (
        "exact" |
        "fresh-after" |
        "fresh-before"
    ) : (
        "latest" |
        "latest-fresh"
    )
);

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
