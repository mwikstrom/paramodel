import { Type } from "paratype";
import { ReadModel } from "./model";
import { QueryFunc, QueryHandler } from "./query-handler";

export function defineQuery<
    Views extends ReadModel,
    Scope,
    Dependencies extends (string & keyof Views)[],
    Params extends Record<string, unknown>,
    Result,
>(
    type: Type<Result>,
    params: Type<Params>,
    dependencies: Dependencies,
    exec: QueryFunc<Pick<Views, Dependencies[number]>, Params, Scope, Result>,
): QueryHandler<Params, Result, Pick<Views, Dependencies[number]>, Scope> {
    return Object.freeze({
        kind: "query",
        type,
        params,
        dependencies: Object.freeze(new Set(dependencies)),
        exec,
    });
}
