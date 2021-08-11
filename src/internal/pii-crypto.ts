/** @internal */
export interface _PiiKey {
    readonly version: number;
}

/** @internal */
export const _encryptPii = (key: _PiiKey, value: string): Promise<ArrayBuffer> => {
    throw new Error("TODO: Implement _encryptString");
};

/** @internal */
export const _decryptPii = (key: _PiiKey, value: ArrayBuffer): Promise<string | undefined> => {
    throw new Error("TODO: Implement _decryptString");
};
