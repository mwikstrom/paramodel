<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [paramodel](./paramodel.md) &gt; [StateDefinition](./paramodel.statedefinition.md) &gt; [dependencies](./paramodel.statedefinition.dependencies.md)

## StateDefinition.dependencies property

Optional array of vies keys that the state projection depends upon.

These views will automatically be synced to the current version just before mutators are applied and are made available via the `view` function (third argument of [StateApplyFunc](./paramodel.stateapplyfunc.md)<!-- -->).

<b>Signature:</b>

```typescript
dependencies?: Dependencies;
```
