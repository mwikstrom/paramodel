import { QueryHandler } from "../query-handler";
import { QueryView } from "../query-view";

/** @internal */
export class _QueryViewImpl<P extends Record<string, unknown>, T> implements QueryView<P, T> {
    #handler: QueryHandler<P, T>
    public readonly kind = "query";
    public readonly version: number;

    constructor(
        handler: QueryHandler<P, T>,
        version: number
    ) {
        this.#handler = handler;
        this.version = version;
    }

    query = (params: P): Promise<T> => {
        throw new Error("TODO: Method not implemented.");
    }
}