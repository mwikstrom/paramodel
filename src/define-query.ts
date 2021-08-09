import { Type } from "paratype";
import { ReadModel } from "./model";
import { QueryAuthFunc, QueryExecFunc, QueryHandler } from "./query-handler";

/**
 * Creates a {@link QueryHandler}
 * @param this - <i>(Ignored)</i> This function uses implicit `this` binding
 * @param type - Type of query result
 * @param params - Type of query params
 * @param dependencies - A set of view keys that the query depends upon.
 * @param exec - The query executor function
 * @param auth - <i>(Optional)</i> A function that provides authorization to query results.
 * 
 * @public
 */
export function defineQuery<
    Views extends ReadModel,
    Result,
    Params extends Record<string, unknown> = Record<string, unknown>,
    Scope = unknown,
    Dependencies extends (string & keyof Views)[] = [],
>(
    this: void,
    type: Type<Result>,
    params: Type<Params>,
    dependencies: Dependencies,
    exec: QueryExecFunc<Pick<Views, Dependencies[number]>, Params, Scope, Result>,
    auth?: QueryAuthFunc<Pick<Views, Dependencies[number]>, Params, Scope, Result>,
): QueryHandler<Params, Result, Pick<Views, Dependencies[number]>, Scope> {
    return Object.freeze({
        kind: "query",
        type,
        params,
        dependencies: Object.freeze(new Set(dependencies)),
        exec,
        auth,
    });
}
