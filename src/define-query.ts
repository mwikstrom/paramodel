import { Type } from "paratype";
import { ReadModel } from "./model";
import { QueryAuthFunc, QueryExecFunc, QueryHandler } from "./query-handler";

/**
 * Settings that define a query handler
 * @public
 */
export interface QueryDefinition<
    Views extends ReadModel,
    Result,
    Params extends Record<string, unknown> = Record<string, unknown>,
    Scope = unknown,
    Dependencies extends (string & keyof Views)[] = [],
>{
    /** Query result type */
    type: Type<Result>;

    /** Query parameter type */
    params: Type<Params>;

    /**
     * Optional array of vies keys that the query handler depends upon.
     * 
     * These views will automatically be synced to the current version just before the query handler
     * is executed and are made available via the `view` function (second argument of {@link QueryExecFunc}).
     */
    dependencies: Dependencies;
    
    /** Query executor function */
    exec: QueryExecFunc<Pick<Views, Dependencies[number]>, Params, Scope, Result>;

    /** Optional function that provide authorization */
    auth?: QueryAuthFunc<Pick<Views, Dependencies[number]>, Params, Scope, Result>;
}

/**
 * Creates a {@link QueryHandler}
 * @param this - <i>(Ignored)</i> This function uses implicit `this` binding
 * @param definition - Query definition
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
    definition: QueryDefinition<Views, Result, Params, Scope, Dependencies>,
): QueryHandler<Params, Result, Pick<Views, Dependencies[number]>, Scope> {
    const {
        type,
        params,
        dependencies,
        exec,
        auth,
    } = definition;
    return Object.freeze({
        kind: "query",
        type,
        params,
        dependencies: Object.freeze(new Set(dependencies)),
        exec,
        auth,
    });
}
