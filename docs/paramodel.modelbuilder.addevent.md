<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [paramodel](./paramodel.md) &gt; [ModelBuilder](./paramodel.modelbuilder.md) &gt; [addEvent](./paramodel.modelbuilder.addevent.md)

## ModelBuilder.addEvent() method

<b>Signature:</b>

```typescript
addEvent<EventKey extends string, EventArg>(key: EventKey, type: Type<EventArg>): ModelBuilder<Events & ChangeModel<EventKey, EventArg>, Views, Actions, Scope>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  key | EventKey |  |
|  type | Type&lt;EventArg&gt; |  |

<b>Returns:</b>

[ModelBuilder](./paramodel.modelbuilder.md)<!-- -->&lt;Events &amp; [ChangeModel](./paramodel.changemodel.md)<!-- -->&lt;EventKey, EventArg&gt;, Views, Actions, Scope&gt;
