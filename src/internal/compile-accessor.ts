import { JsonObject, JsonValue } from "paratype";

/** @internal */
export const _compileAccessor = (path: readonly string[]): _Accessor => record => path.reduce(
    (prev, prop) => typeof prev === "object" && prev !== null && !Array.isArray(prev) && prop in prev ?
        prev[prop] :
        void(0),
    record as JsonValue | undefined,
);

/** @internal */
export type _Accessor = (record: JsonObject) => JsonValue | undefined;
