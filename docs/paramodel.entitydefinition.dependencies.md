<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [paramodel](./paramodel.md) &gt; [EntityDefinition](./paramodel.entitydefinition.md) &gt; [dependencies](./paramodel.entitydefinition.dependencies.md)

## EntityDefinition.dependencies property

Optional array of vies keys that the entity projection depends upon.

These views will automatically be synced to the current version just before mutators are applied and are made available via the `view` function (third argument of [EntityProjectionFunc](./paramodel.entityprojectionfunc.md)<!-- -->).

<b>Signature:</b>

```typescript
dependencies?: Dependencies;
```