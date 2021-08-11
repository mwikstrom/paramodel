/** @internal */
export interface _PiiKey {
    readonly version: number;
}

/** @internal */
export const _decryptPii = (key: _PiiKey, value: ArrayBuffer): Promise<string | undefined> => {
    throw new Error("TODO: Implement _decryptString");
};
