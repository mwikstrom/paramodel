/** @internal */
export const _partitionKeys = Object.freeze({
    history: "history",
    pii: "pii",
    view: (viewKey: string) => `view:${viewKey}`,
    views: "views",
});

/** @internal */
export const _rowKeys = Object.freeze({
    commit: (version: number) => version.toString(10).padStart(16, "0"),
    piiSync: "sync",
    piiScope: (scope: string) => `$${scope}`,
    viewState: (version: number) => `state:${version.toString(10).padStart(16, "0")}`,
    entity: (key: string, version: number) => `entity:${version.toString(10).padStart(16, "0")}:${key}`,
});

/** @internal */
export const _parseVersionFromViewStateRowKey = (key: string): number => {
    const m = /^state:([0-9]{16})$/.exec(key);
    if (!m) {
        throw new Error(`Not a valid view state row key: ${key}`);
    }
    return parseInt(m[1], 10);
};
