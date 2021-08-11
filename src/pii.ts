import { classType, ErrorCallback, JsonValue, PathArray, Type } from "paratype";
import { _PiiStringData, _piiStringDataType } from "./internal/pii-crypto";

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

    /** @internal */
    _getData(): _PiiStringData;
}

/** @internal */
export const _createPiiString = (data: _PiiStringData): PiiString => new _PiiString(data);

type PiiStringInterface = PiiString;
const _PiiString = class PiiString implements PiiStringInterface {
    static fromJsonValue(value: JsonValue, error?: ErrorCallback, path?: PathArray) {
        return new _PiiString(_piiStringDataType.fromJsonValue(value, error, path));
    }

    #data: _PiiStringData;

    constructor(data: _PiiStringData) {
        this.#data = data;
    }

    toString = () => this.#data.obf;
    valueOf = () => this.#data.obf;
    toJSON = () => this.#data.obf;
    _getData = () => this.#data;
    toJsonValue = (error?: ErrorCallback, path?: PathArray) => _piiStringDataType.toJsonValue(this.#data, error, path);
};

/**
 * A type that represents a {@link _PiiStringData}
 * @public
 */
export const piiStringType = classType(_PiiString) as Type<PiiString>;
