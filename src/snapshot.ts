import { TypeOf } from "paratype";
import { AbortOptions } from "./abort";
import { CollectionView } from "./collection";
import { Commit } from "./commit";
import { EventsDomain, ProjectionsDomain } from "./domain";
import { ProjectionView } from "./projection";

/** @public */
export interface Snapshot<D extends ProjectionsDomain> {
    read(this: void): Promise<SnapshotData<D>>;
    view<K extends keyof D["projections"]>(this: void, key: K, options?: AbortOptions): Promise<ProjectionView<D, K>>;
    entities<K extends keyof D["collections"]>(this: void, key: K, options?: AbortOptions): Promise<CollectionView<D, K>>;
}

/** @public */
export interface SnapshotData<D extends EventsDomain> {
    readonly commit: Commit<TypeOf<D["meta"]>>;
    readonly changes: ReadonlyArray<[keyof D["events"], D["events"][string]]>;
}