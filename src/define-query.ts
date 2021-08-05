import { Type } from "paratype";
import { ReadModel } from "./model";
import { QueryAuthFunc, QueryExecFunc, QueryHandler } from "./query-handler";

export function defineQuery<
    Views extends ReadModel,
    Result,
    Params extends Record<string, unknown> = Record<string, unknown>,
    Scope = unknown,
    Dependencies extends (string & keyof Views)[] = [],
>(
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
