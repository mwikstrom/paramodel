<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [paramodel](./paramodel.md) &gt; [Filtered](./paramodel.filtered.md)

## Filtered type

<b>Signature:</b>

```typescript
export declare type Filtered<T> = T extends Queryable<T> ? Queryable<T> : T extends SortedQueryable<T> ? SortedQueryable<T> : Filterable<T>;
```
<b>References:</b> [Queryable](./paramodel.queryable.md)<!-- -->, [SortedQueryable](./paramodel.sortedqueryable.md)<!-- -->, [Filterable](./paramodel.filterable.md)
