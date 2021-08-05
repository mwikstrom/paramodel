/** @internal */
export const _partitionKeys = Object.freeze({
    commits: "commits",
    view: (viewKey: string) => `view:${viewKey}`,
});

/** @internal */
export const _rowKeys = Object.freeze({
    commit: (version: number) => version.toString(10).padStart(16, "0"),
    viewHeader: "header",
    viewState: (version: number) => `state:${version.toString(10).padStart(16, "0")}`,
    entity: (key: string, version: number) => `entity:${version.toString(10).padStart(16, "0")}:${key}`,
});
