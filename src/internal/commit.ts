import { 
    arrayType, 
    JsonValue, 
    jsonValueType, 
    positiveIntegerType, 
    recordType, 
    stringType, 
    timestampType, 
    Type 
} from "paratype";
import { Change } from "../change";

/** @internal */
export type _Commit = {
    version: number;
    position: number;
    timestamp: Date;
    changes: readonly string[];
    events: readonly Omit<Change<JsonValue>, "version" | "timestamp" | "position">[];
}

/** @internal */
export const _commitType: Type<_Commit> = recordType({
    version: positiveIntegerType,
    position: positiveIntegerType,
    timestamp: timestampType,
    changes: arrayType(stringType),
    events: arrayType(recordType({
        position: positiveIntegerType,
        key: stringType,
        arg: jsonValueType,
    })),
}).restrict(
    "Commit record's changes and events must be consistent",
    ({changes, events}) => {
        const expected = new Set(events.map(e => e.key));
        return (
            changes.length === expected.size &&
            changes.every(key => expected.has(key))
        );
    }
);
