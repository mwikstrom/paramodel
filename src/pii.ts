import {
    binaryType,
    classType,
    ErrorCallback, 
    JsonValue, 
    PathArray, 
    positiveIntegerType, 
    recordType, 
    stringType, 
    Type 
} from "paratype";

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
 * An encrypted and obfuscated string that contains personally identifiable information (PII)
 * @public
 */
export interface PiiString {
    /** Gets the obfuscated value */
    toString(): string;
    
    /** Gets the obfuscated value */
    valueOf(): string;

    /** Gets the underlying json data */
    toJsonValue(error?: ErrorCallback, path?: PathArray): JsonValue;

    /** Gets the PII scope name */
    getScopeName(): string;

    /** Gets the PII scope version */
    getScopeVersion(): number;

    /** Gets the encrypted value */
    getEncryptedValue(): ArrayBuffer;
}

type PiiStringInterface = PiiString;
const _PiiString = class PiiString implements PiiStringInterface {
    static fromJsonValue(value: JsonValue, error?: ErrorCallback, path?: PathArray) {
        return new _PiiString(_piiStringDataType.fromJsonValue(value, error, path));
    }

    #data: _PiiStringData;

    constructor(data: _PiiStringData) {
        this.#data = data;
    }

    toString = () => this.#data.obfuscated;
    valueOf = () => this.#data.obfuscated;
    toJSON = () => this.#data.obfuscated;
    getScopeName = () => this.#data.scope;
    getScopeVersion = () => this.#data.version;
    getEncryptedValue = () => this.#data.encrypted;
    toJsonValue = (error?: ErrorCallback, path?: PathArray) => _piiStringDataType.toJsonValue(this.#data, error, path);
};

/**
 * A type that represents a {@link _PiiStringData}
 * @public
 */
export const piiStringType = classType(_PiiString) as Type<PiiString>;

interface _PiiStringData {
    /** Obfuscated value - must not contain PII */
    readonly obfuscated: string;

    /** Scope of the PII  */
    readonly scope: string;

    /** Commit version when the PII scope was initialized */
    readonly version: number;

    /** Encrypted value */
    readonly encrypted: ArrayBuffer;    
}

const _piiStringDataType: Type<_PiiStringData> = recordType({
    obfuscated: stringType,
    scope: stringType,
    version: positiveIntegerType,
    encrypted: binaryType,
});
