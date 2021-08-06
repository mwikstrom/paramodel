import { enumType, nonNegativeIntegerType, recordType, timestampType, Type } from "paratype";

/** @internal */
export type _ViewHeader = {
    readonly kind: _MaterialViewKind;
    readonly sync_version: number;
    readonly sync_position: number;
    readonly sync_timestamp: Date;
    readonly last_change_version: number;
    readonly last_change_timestamp: Date;
    readonly purge_start_version: number;
    readonly purge_end_version: number;
};

/** @internal */
export type _MaterialViewKind = "state" | "entities";

/** @internal */
export const _materialViewKindType: Type<_MaterialViewKind> = enumType(["state", "entities"]);

/** @internal */
export const _viewHeader: Type<_ViewHeader> = recordType({
    kind: _materialViewKindType,
    sync_version: nonNegativeIntegerType,
    sync_position: nonNegativeIntegerType,
    sync_timestamp: timestampType,
    last_change_version: nonNegativeIntegerType,
    last_change_timestamp: timestampType,
    purge_start_version: nonNegativeIntegerType,
    purge_end_version: nonNegativeIntegerType,
});

/** @internal */
export const _getMinSyncVersion = (headers: (_ViewHeader | undefined)[]): number => {
    let version: number | undefined;
    for (const header of headers) {
        if (!header) {
            continue;
        } else if (version === void(0)) {
            version = header.sync_version;
        } else {
            version = Math.min(version, header.sync_version);
        }
    }
    return version || 0;
};
