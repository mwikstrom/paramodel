<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [paramodel](./paramodel.md) &gt; [EntityAuthFunc](./paramodel.entityauthfunc.md)

## EntityAuthFunc type

<b>Signature:</b>

```typescript
export declare type EntityAuthFunc<Scope, T extends Record<string, unknown> = Record<string, unknown>, R extends ReadModel = ReadModel> = (query: Filterable<T>, scope: Scope, view: ViewSnapshotFunc<R>) => Promise<Filterable<T> | Forbidden>;
```
<b>References:</b> [ReadModel](./paramodel.readmodel.md)<!-- -->, [Filterable](./paramodel.filterable.md)<!-- -->, [ViewSnapshotFunc](./paramodel.viewsnapshotfunc.md)<!-- -->, [Forbidden](./paramodel.forbidden.md)
