<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [paramodel](./paramodel.md) &gt; [defineEntity](./paramodel.defineentity.md)

## defineEntity() function

<b>Signature:</b>

```typescript
export declare function defineEntity<Events extends ChangeModel, Views extends ReadModel, Scope, Props extends Record<string, unknown>, Mutators extends string & keyof Events, Dependencies extends (string & keyof Views)[]>(type: Type<Props>, dependencies: Dependencies, on: {
    [K in Mutators]: EntityProjectionFunc<ChangeModel<K, Events[K]>, Pick<Views, Dependencies[number]>, Props>;
}, auth?: EntityAuthFunc<Scope, Props, Pick<Views, Dependencies[number]>>): EntityProjection<Props, Events, Views, Scope>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  type | Type&lt;Props&gt; |  |
|  dependencies | Dependencies |  |
|  on | { \[K in Mutators\]: [EntityProjectionFunc](./paramodel.entityprojectionfunc.md)<!-- -->&lt;[ChangeModel](./paramodel.changemodel.md)<!-- -->&lt;K, Events\[K\]&gt;, Pick&lt;Views, Dependencies\[number\]&gt;, Props&gt;; } |  |
|  auth | [EntityAuthFunc](./paramodel.entityauthfunc.md)<!-- -->&lt;Scope, Props, Pick&lt;Views, Dependencies\[number\]&gt;&gt; |  |

<b>Returns:</b>

[EntityProjection](./paramodel.entityprojection.md)<!-- -->&lt;Props, Events, Views, Scope&gt;
