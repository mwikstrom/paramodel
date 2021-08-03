import { EntityProjection } from "./entity-projection";
import { EntityView } from "./entity-view";
import { ReadModel } from "./model";
import { QueryHandler } from "./query-handler";
import { QueryView } from "./query-view";
import { StateProjection } from "./state-projection";
import { StateView } from "./state-view";

export type Projection = {
    kind: "state" | "query" | "entities"
};

export type ViewOf<H extends Projection> =
    H extends StateProjection<infer T, any, any, any> ? StateView<T> :
    H extends QueryHandler<infer P, infer T, any, any> ? QueryView<P, T> :
    H extends EntityProjection<infer T, any, any, any> ? EntityView<T> :
    View;

export type View = StateView | QueryView | EntityView;

export type ViewSnapshotFunc<R extends ReadModel> = <K extends string & keyof R>(key: K) => Promise<ViewOf<R[K]>>;
