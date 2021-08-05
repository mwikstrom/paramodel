import { EntityProjection } from "./entity-projection";
import { EntityView } from "./entity-view";
import { ReadModel } from "./model";
import { QueryHandler } from "./query-handler";
import { QueryView } from "./query-view";
import { StateProjection } from "./state-projection";
import { StateView } from "./state-view";

export type Projection = StateProjection | QueryHandler | EntityProjection;

export type ViewOf<H extends Projection> =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    H extends StateProjection<infer T, any, any, any> ? StateView<T> :
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    H extends QueryHandler<infer P, infer T, any, any> ? QueryView<P, T> :
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    H extends EntityProjection<infer T, infer K, any, any, any> ? EntityView<T, K> :
    View;

export type View = StateView | QueryView | EntityView<Record<string, string | number>, string>;

export type ViewSnapshotFunc<R extends ReadModel> = <K extends string & keyof R>(
    this: void,
    key: K,
) => Promise<ViewOf<R[K]>>;
