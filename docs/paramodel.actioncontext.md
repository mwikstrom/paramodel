<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [paramodel](./paramodel.md) &gt; [ActionContext](./paramodel.actioncontext.md)

## ActionContext interface


<b>Signature:</b>

```typescript
export interface ActionContext<D extends ProjectionsDomain, T> 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [base](./paramodel.actioncontext.base.md) | [Snapshot](./paramodel.snapshot.md)<!-- -->&lt;D&gt; |  |
|  [commit](./paramodel.actioncontext.commit.md) | [Commit](./paramodel.commit.md)<!-- -->&lt;TypeOf&lt;D\["meta"\]&gt;&gt; |  |
|  [emit](./paramodel.actioncontext.emit.md) | [Emitter](./paramodel.emitter.md)<!-- -->&lt;D&gt; |  |
|  [input](./paramodel.actioncontext.input.md) | T |  |

## Methods

|  Method | Description |
|  --- | --- |
|  [conflict(message)](./paramodel.actioncontext.conflict.md) |  |
|  [conflict(when)](./paramodel.actioncontext.conflict_1.md) |  |
|  [conflict(when, message)](./paramodel.actioncontext.conflict_2.md) |  |
