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
import { Change, ChangeType } from "../change";
import { ChangeModel } from "../model";

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

/** @internal */
export const _getChangesFromCommit = <Events extends ChangeModel>(
    commit: _Commit,
    model: Events,
    filter?: ReadonlySet<string>,
): ChangeType<Events>[] => {
    const { timestamp, version } = commit;
    const result: ChangeType<Events>[]= [];
    let { position } = commit;

    for (const entry of commit.events) {
        const { key, arg, ...rest } = entry;

        if (filter === void(0) || filter.has(key)) {
            const eventType = model[key];
            if (!eventType) {
                throw new Error(`Cannot read unknown event: ${key}`);
            }

            const change: Change = {
                ...rest,
                key: key,
                timestamp, 
                version, 
                position,
                arg: eventType.fromJsonValue(arg),
            };

            result.push(change as ChangeType<Events>);
        }

        ++position;
    }

    return result;
};
