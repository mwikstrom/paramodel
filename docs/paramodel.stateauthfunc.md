<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [paramodel](./paramodel.md) &gt; [StateAuthFunc](./paramodel.stateauthfunc.md)

## StateAuthFunc type

<b>Signature:</b>

```typescript
export declare type StateAuthFunc<Scope = unknown, T = unknown, R extends ReadModel = ReadModel> = (this: void, scope: Scope, state: T, view: ViewSnapshotFunc<R>) => Promise<T | Forbidden>;
```
<b>References:</b> [ReadModel](./paramodel.readmodel.md)<!-- -->, [ViewSnapshotFunc](./paramodel.viewsnapshotfunc.md)<!-- -->, [Forbidden](./paramodel.forbidden.md)
