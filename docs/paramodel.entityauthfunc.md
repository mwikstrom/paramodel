<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [paramodel](./paramodel.md) &gt; [EntityAuthFunc](./paramodel.entityauthfunc.md)

## EntityAuthFunc type

A function that authorizes access to entities

<b>Signature:</b>

```typescript
export declare type EntityAuthFunc<Scope, T, R extends ReadModel = ReadModel> = (query: Queryable<T>, scope: Scope, view: ViewSnapshotFunc<R>) => Promise<Queryable<T> | Forbidden>;
```
<b>References:</b> [ReadModel](./paramodel.readmodel.md)<!-- -->, [Queryable](./paramodel.queryable.md)<!-- -->, [ViewSnapshotFunc](./paramodel.viewsnapshotfunc.md)<!-- -->, [Forbidden](./paramodel.forbidden.md)

