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
import { _ConversionContextFactory } from "./store-impl";

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
export const _getChangesFromCommit = async <Events extends ChangeModel>(
    commit: _Commit,
    model: Events,
    makeConversionContext: _ConversionContextFactory,
    filter?: ReadonlySet<string>,
): Promise<ChangeType<Events>[]> => {
    const { timestamp, version } = commit;
    const result: ChangeType<Events>[]= [];
    let { position } = commit;

    for (const entry of commit.events) {
        const { key, arg: jsonArg, ...rest } = entry;

        if (filter === void(0) || filter.has(key)) {
            const eventType = model[key];
            if (!eventType) {
                throw new Error(`Cannot read unknown event: ${key}`);
            }

            const arg = await eventType.fromJsonValue(jsonArg, makeConversionContext());
            const change: Change = {
                ...rest,
                key: key,
                timestamp, 
                version, 
                position,
                arg,
            };

            result.push(change as ChangeType<Events>);
        }

        ++position;
    }

    return result;
};
