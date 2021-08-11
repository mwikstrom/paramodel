<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [paramodel](./paramodel.md) &gt; [TransparentPii](./paramodel.transparentpii.md)

## TransparentPii type

Recursively replaces `string` with a union of `string` and [PiiString](./paramodel.piistring.md)

<b>Signature:</b>

```typescript
export declare type TransparentPii<T> = (T extends string ? string | PiiString : T extends Array<infer E> ? Array<TransparentPii<E>> : T extends Record<string, any> ? {
    [K in keyof T]: TransparentPii<T[K]>;
} : T);
```
<b>References:</b> [PiiString](./paramodel.piistring.md)<!-- -->, [TransparentPii](./paramodel.transparentpii.md)
