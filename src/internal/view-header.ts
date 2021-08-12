import { enumType, nonNegativeIntegerType, recordType, timestampType, Type } from "paratype";
import { InputRecord, OutputRecord } from "../driver";
import { _Commit } from "./commit";
import { _rowKeys } from "./data-keys";

/** @internal */
export type _ViewHeader = {
    readonly kind: _MaterialViewKind;
    readonly sync_version: number;
    readonly sync_position: number;
    readonly sync_timestamp: Date;
    readonly last_change_version: number;
    readonly last_change_timestamp: Date;
    readonly purged_from_version: number;
    readonly purged_until_version: number;
};

/** @internal */
export type _MaterialViewKind = "state" | "entities" | "mapped-entities";

/** @internal */
export const _materialViewKindType: Type<_MaterialViewKind> = enumType([
    "state", 
    "entities",
    "mapped-entities"
]);

/** @internal */
export const _viewHeader: Type<_ViewHeader> = recordType({
    kind: _materialViewKindType,
    sync_version: nonNegativeIntegerType,
    sync_position: nonNegativeIntegerType,
    sync_timestamp: timestampType,
    last_change_version: nonNegativeIntegerType,
    last_change_timestamp: timestampType,
    purged_from_version: nonNegativeIntegerType,
    purged_until_version: nonNegativeIntegerType,
});

/** @internal */
export const _getMinSyncVersion = (headers: Iterable<(Pick<_ViewHeader, "sync_version"> | undefined)>): number => {
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

/** @internal */
export type _SyncViewInfo = (
    Omit<_ViewHeader, "kind" | "sync_timestamp" | "last_change_timestamp"> & 
    Partial<Pick<_ViewHeader, "sync_timestamp" | "last_change_timestamp">> &
    { readonly update_token: string | null; }
);

/** @internal */
export const _getSyncInfoFromRecord = (record: OutputRecord | undefined): _SyncViewInfo => {
    let update_token: string | null = null;
    let sync_version = 0;
    let sync_position = 0;
    let sync_timestamp: Date | undefined = void(0);
    let last_change_version = 0;
    let last_change_timestamp: Date | undefined = void(0);
    let purged_from_version = 0;
    let purged_until_version = 0;

    if (record) {
        const header = _viewHeader.fromJsonValue(record.value);
        update_token = record.token;
        sync_version = header.sync_version;
        sync_position = header.sync_position;
        sync_timestamp = header.sync_timestamp;
        last_change_version = header.last_change_version;
        last_change_timestamp = header.last_change_timestamp;
        purged_from_version = header.purged_from_version;
        purged_until_version = header.purged_until_version;
    }

    return Object.freeze({
        update_token,
        sync_version, 
        sync_position,
        sync_timestamp,
        last_change_version,
        last_change_timestamp,
        purged_from_version, 
        purged_until_version, 
    });
};

/** @internal */
export const _getViewHeaderRecordForPurge = (
    purgeVersion: number,
    prev: _SyncViewInfo,
    kind: _MaterialViewKind,
): InputRecord | undefined => {
    const header = _getViewHeaderForPurge(purgeVersion, prev, kind);
    return _getViewHeaderRecord(header, prev.update_token);
};

/** @internal */
export const _getViewHeaderRecordForCommit = (
    commit: _Commit,
    prev: _SyncViewInfo,
    kind: _MaterialViewKind,
    modified: boolean,
): InputRecord | undefined => {
    const header = _getViewHeaderForCommit(commit, prev, kind, modified);
    return _getViewHeaderRecord(header, prev.update_token);
};

const _getViewHeaderRecord = (
    header: _ViewHeader | undefined,
    token: string | null,
): InputRecord | undefined => {
    if(!header) {
        return void(0);
    }

    const jsonHeader = _viewHeader.toJsonValue(header, msg => new Error(`Failed to serialize view header: ${msg}`));
    const input: InputRecord = {
        key: _rowKeys.viewHeader,
        value: jsonHeader,
        replace: token,
        ttl: -1,
    };

    return input;
};

const _getViewHeaderForPurge = (
    purgeVersion: number,
    prev: _SyncViewInfo,
    kind: _MaterialViewKind,
): _ViewHeader | undefined => {
    if (prev.sync_version <= purgeVersion || !prev.sync_timestamp || !prev.last_change_timestamp) {
        return void(0);
    }

    const header: _ViewHeader = Object.freeze({
        kind,
        sync_version: prev.sync_version,
        sync_position: prev.sync_position,
        sync_timestamp: prev.sync_timestamp,
        last_change_version: prev.last_change_version,
        last_change_timestamp: prev.last_change_timestamp,
        purged_from_version: 0,
        purged_until_version: Math.max(prev.purged_until_version, purgeVersion),
    });

    return header;
};

const _getViewHeaderForCommit = (
    commit: _Commit,
    prev: _SyncViewInfo,
    kind: _MaterialViewKind,
    modified: boolean,
): _ViewHeader | undefined => {
    if (prev.sync_version < commit.version) {
        let last_change_timestamp: Date;

        if (modified) {
            last_change_timestamp = commit.timestamp;
        } else if (!prev.last_change_timestamp) {
            throw new Error("Unmodified change must have previous timestamp");
        } else {
            last_change_timestamp = prev.last_change_timestamp;
        }

        const header: _ViewHeader = Object.freeze({
            kind,
            sync_version: commit.version,
            sync_position: commit.position + commit.changes.length,
            sync_timestamp: commit.timestamp,
            last_change_version: modified ? commit.version : prev.last_change_version,
            last_change_timestamp,
            purged_from_version: prev.purged_from_version,
            purged_until_version: prev.purged_until_version,
        });

        return header;
    } else if (prev.purged_from_version <= commit.version && prev.purged_until_version >= commit.version) {
        let purged_from_version = commit.version + 1;
        let purged_until_version = prev.purged_until_version;

        if (purged_from_version > purged_until_version) {
            purged_from_version = purged_until_version = 0;
        }

        if (!prev.sync_timestamp || !prev.last_change_timestamp) {
            throw new Error("Non-latest change must have previous timestamp");
        }

        const header: _ViewHeader = Object.freeze({
            kind,
            sync_version: prev.sync_version,
            sync_position: prev.sync_position,
            sync_timestamp: prev.sync_timestamp,
            last_change_version: prev.last_change_version,
            last_change_timestamp: prev.last_change_timestamp,
            purged_from_version,
            purged_until_version,
        });

        return header;
    }
};