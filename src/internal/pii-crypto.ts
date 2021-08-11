import crypto from "crypto";
import { binaryType, positiveIntegerType, recordType, stringType, Type } from "paratype";

/** @internal */
export interface _PiiKey {
    readonly alg: "aes-256-gcm";
    readonly ver: number;
    readonly val: ArrayBuffer;
}

/** @internal */
export interface _PiiStringData {
    /** Obfuscated value - must not contain PII */
    readonly obf: string;

    /** Scope of the PII  */
    readonly scp: string;

    /** Commit version when the PII was created */
    readonly ver: number;

    /** Cipher initialization vector */
    readonly iv: ArrayBuffer;

    /** Encrypted value */
    readonly enc: ArrayBuffer;

    /** Authentication tag */
    readonly tag: ArrayBuffer;
}

/** @internal */
export type _PiiStringAuthData = Pick<_PiiStringData, "obf" | "scp" | "ver">;

/** @internal */
export const _piiStringDataType: Type<_PiiStringData> = recordType({
    obf: stringType,
    scp: stringType,
    ver: positiveIntegerType,
    iv: binaryType,
    enc: binaryType,
    tag: binaryType,
});

/** @internal */
export const _encryptPii = (
    key: _PiiKey,
    plain: string,
    auth: _PiiStringAuthData,
): _PiiStringData => {
    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(key.alg, Buffer.from(key.val), nonce);
    cipher.setAAD(formatAuthData(auth));
    const first = cipher.update(plain, "utf8");
    const final = cipher.final();
    const encrypted = Buffer.concat([first, final]);
    const tag = cipher.getAuthTag();
    const result: _PiiStringData = Object.freeze({
        ...auth,
        enc: bufferToArrayBuffer(encrypted),
        iv: bufferToArrayBuffer(nonce),
        tag: bufferToArrayBuffer(tag),
    });
    return result;
};

/** @internal */
export const _decryptPii = (key: _PiiKey, data: _PiiStringData): string | undefined => {
    const decipher = crypto.createDecipheriv(key.alg, Buffer.from(key.val), Buffer.from(data.iv));
    const authData = formatAuthData(data);
    decipher.setAAD(authData);
    decipher.setAuthTag(Buffer.from(data.tag));
    try {
        const first = decipher.update(Buffer.from(data.enc));
        const final = decipher.final();
        const decrypted = Buffer.concat([first, final]);
        return decrypted.toString("utf8");
    } catch {
        return void(0);
    }
};

const formatAuthData = ({ obf, scp, ver}: _PiiStringAuthData) => Buffer.from(`${scp}@${ver}#${obf}`, "utf8");

const bufferToArrayBuffer = (buf: Buffer): ArrayBuffer => (
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
);
