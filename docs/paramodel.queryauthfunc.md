<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [paramodel](./paramodel.md) &gt; [QueryAuthFunc](./paramodel.queryauthfunc.md)

## QueryAuthFunc type

<b>Signature:</b>

```typescript
export declare type QueryAuthFunc<R extends ReadModel = ReadModel, P extends Record<string, unknown> = Record<string, unknown>, Scope = unknown, T = unknown> = (this: void, exec: QueryExecFunc<R, P, Scope, T>, view: ViewSnapshotFunc<R>, params: P, scope: Scope) => Promise<T | Forbidden>;
```
<b>References:</b> [ReadModel](./paramodel.readmodel.md)<!-- -->, [QueryExecFunc](./paramodel.queryexecfunc.md)<!-- -->, [ViewSnapshotFunc](./paramodel.viewsnapshotfunc.md)<!-- -->, [Forbidden](./paramodel.forbidden.md)
