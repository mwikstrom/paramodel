import { binaryType, positiveIntegerType, recordType, stringType, Type } from "paratype";

/**
 * An encrypted and obfuscated string that contains personally identifiable information (PII)
 * @public
 */
// TODO: Use a symbol for identifying PiiStrings
export interface PiiString {
    /** Obfuscated value - must not contain PII */
    readonly obfuscated: string;

    /** Scope of the PII  */
    readonly scope: string;

    /** Commit version when the PII scope was initialized */
    readonly version: number;

    /** Encrypted value */
    readonly encrypted: ArrayBuffer;    
}

/**
 * Recursively replaces {@link PiiString} with `string`
 * @public
 */
export type ExposedPii<T> = (
    T extends PiiString ? string :
    T extends Array<infer E> ? Array<ExposedPii<E>> :
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends Record<string, any> ? {
        [K in keyof T]: ExposedPii<T[K]>
    } :
    T
);

/**
 * Recursively replaces `string` with a union of `string` and {@link PiiString}
 * @public
 */
export type TransparentPii<T> = (
    T extends string ? string | PiiString :
    T extends Array<infer E> ? Array<TransparentPii<E>> :
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends Record<string, any> ? {
        [K in keyof T]: TransparentPii<T[K]>
    } :
    T
);

/**
 * A record type that represents a {@link PiiStringData}
 * @public
 */
export const piiStringType: Type<PiiString> = recordType({
    obfuscated: stringType,
    scope: stringType,
    version: positiveIntegerType,
    encrypted: binaryType,
});
