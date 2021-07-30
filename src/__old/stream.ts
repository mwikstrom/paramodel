import { TypeOf } from "paratype";
import { AbortOptions } from "./abort";
import { ActionResult } from "./action";
import { Batch } from "./batch";
import { CollectionView } from "./collection";
import { CommitOptions, CommitSearchOptions } from "./commit";
import { Domain } from "./domain";
import { ProjectionView } from "./projection";
import { Snapshot, SnapshotData } from "./snapshot";

/** @public */
export interface EventStream<D extends Domain> {
    readonly id: string;
    readonly domain: D;
    batch(this: void, options?: CommitOptions<TypeOf<D["meta"]>>): Batch<D>;
    do<K extends keyof D["actions"]>(
        this: void, 
        action: K,
        input: TypeOf<D["actions"][K]["input"]>,
        options?: CommitOptions<TypeOf<D["meta"]>>,
    ): Promise<ActionResult<D, TypeOf<D["actions"][K]["output"]>>>;
    read(this: void, options?: ReadOptions): AsyncIterable<SnapshotData<D>>;
    peek(this: void, options?: PeekOptions): Promise<Snapshot<D> | null>;
    view<K extends keyof D["projections"]>(this: void, key: K, options?: PeekOptions): Promise<ProjectionView<D, K>>;
    entities<K extends keyof D["collections"]>(
        this: void, 
        key: K, 
        options?: PeekOptions
    ): Promise<CollectionView<D, K>>;
}

/** @public */
export interface ReadOptions extends AbortOptions {
    start?: CommitSearchOptions;
    end?: CommitSearchOptions;
}

/** @public */
export type PeekOptions = CommitSearchOptions & AbortOptions;
