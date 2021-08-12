import { EntityMapping } from "./entity-mapping";
import { EntityProjection } from "./entity-projection";
import { EntityView } from "./entity-view";
import { ReadModel } from "./model";
import { QueryHandler } from "./query-handler";
import { QueryView } from "./query-view";
import { StateProjection } from "./state-projection";
import { StateView } from "./state-view";
import { ViewOptions } from "./store";

/**
 * A type alias that represents any projection (state, query or entities)
 * @public
 */
export type AnyProjection = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    StateProjection<any, any, any, any> | 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    QueryHandler<any, any, any, any> | 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    EntityProjection<any, any, any, any, any> |
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    EntityMapping<any, any, any, any, any>
);

/**
 * Extracts the view type of a projection
 * @public
 */
export type ViewOf<H extends AnyProjection> =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    H extends StateProjection<infer T, any, any, any> ? StateView<T> :
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    H extends QueryHandler<infer P, infer T, any, any> ? QueryView<P, T> :
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    H extends EntityProjection<infer T, infer K, any, any, any> ? EntityView<T, K> :
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    H extends EntityMapping<infer T, infer K, any, any, any, any> ? EntityView<T, K> :
    View;

/**
 * A type alias that represents a view
 * @public
 */
export type View = StateView | QueryView | EntityView<Record<string, string | number>, string>;

/**
 * The view snapshot function
 * @public
 */
export type ViewSnapshotFunc<R extends ReadModel> = <K extends string & keyof R>(
    this: void,
    key: K,
    options?: Partial<Pick<ViewOptions, "auth">>,
) => Promise<ViewOf<R[K]>>;
