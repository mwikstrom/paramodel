import { FilterSpec, QuerySpec } from "../driver";
import { Page } from "../queryable";

/** @internal */
export interface _QuerySource<T> {
    count(
        this: void, 
        where: readonly FilterSpec[],
    ): Promise<number>;

    page(
        this: void,
        query: QuerySpec,
    ): Promise<Page<T>>;
}