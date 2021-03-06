<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [paramodel](./paramodel.md) &gt; [DomainStore](./paramodel.domainstore.md) &gt; [sync](./paramodel.domainstore.sync.md)

## DomainStore.sync() method

Synchronizes the views of the current store

<b>Signature:</b>

```typescript
sync<K extends string & keyof Model["views"]>(this: void, options?: Partial<SyncOptions<K>>): Promise<number>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  this | void | <i>(Ignored)</i> This function uses implicit <code>this</code> binding |
|  options | Partial&lt;[SyncOptions](./paramodel.syncoptions.md)<!-- -->&lt;K&gt;&gt; | <i>(Optional)</i> Synchronization options |

<b>Returns:</b>

Promise&lt;number&gt;

