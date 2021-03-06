<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [paramodel](./paramodel.md) &gt; [DomainStore](./paramodel.domainstore.md)

## DomainStore interface

A domain store

<b>Signature:</b>

```typescript
export interface DomainStore<Model extends DomainModel> 
```

## Methods

|  Method | Description |
|  --- | --- |
|  [disclose(this, value)](./paramodel.domainstore.disclose.md) | Processes the specified value recursively by replacing any [PiiString](./paramodel.piistring.md) with the underlying decrypted or obfuscated value. |
|  [do(this, key, input, options)](./paramodel.domainstore.do.md) | Executes an action |
|  [purge(this, options)](./paramodel.domainstore.purge.md) | Purges the views of the current store |
|  [read(this, options)](./paramodel.domainstore.read.md) | Reads change history |
|  [shred(this, options)](./paramodel.domainstore.shred.md) | Obfuscates all disclosed and encrypted PII that has been shredded. |
|  [stat(this)](./paramodel.domainstore.stat.md) | Returns status of the current store |
|  [sync(this, options)](./paramodel.domainstore.sync.md) | Synchronizes the views of the current store |
|  [view(this, key, options)](./paramodel.domainstore.view.md) | Gets a view snapshot |

