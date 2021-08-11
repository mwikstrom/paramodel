import { positiveIntegerType, recordType, stringType } from "paratype";

/**
 * An encrypted and obfuscated string that contains personally identifiable information (PII)
 * @public
 */
export interface PiiString {
    /** Obfuscated value - must not contain PII */
    readonly obfuscated: string;

    /** Scope of the PII  */
    readonly scope: string;

    /** Commit version when the PII scope was initialized */
    readonly version: number;

    /** Encrypted value */
    readonly encrypted: string;    
}

/**
 * Type alias that exposes the decrypted or obfuscated value of {@link PiiString|PII}
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
 * A record type that represents a {@link PiiString}
 * @public
 */
export const piiStringType = recordType({
    obfuscated: stringType,
    scope: stringType,
    version: positiveIntegerType,
    encrypted: stringType,
});
