<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [paramodel](./paramodel.md) &gt; [StateDefinition](./paramodel.statedefinition.md)

## StateDefinition interface

Settings that define a state projection

<b>Signature:</b>

```typescript
export interface StateDefinition<State, Events extends ChangeModel = ChangeModel, Scope = unknown, Views extends ReadModel = ReadModel, Mutators extends (string & keyof Events)[] = [], Dependencies extends (string & keyof Views)[] = []> 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [auth?](./paramodel.statedefinition.auth.md) | [StateAuthFunc](./paramodel.stateauthfunc.md)<!-- -->&lt;Scope, State, Pick&lt;Views, Dependencies\[number\]&gt;&gt; | <i>(Optional)</i> An optional [StateAuthFunc](./paramodel.stateauthfunc.md) that authorizes access to the defined state |
|  [dependencies?](./paramodel.statedefinition.dependencies.md) | Dependencies | <i>(Optional)</i> Optional array of vies keys that the state projection depends upon.<!-- -->These views will automatically be synced to the current version just before mutators are applied and are made available via the <code>view</code> function (third argument of [StateApplyFunc](./paramodel.stateapplyfunc.md)<!-- -->). |
|  [initial](./paramodel.statedefinition.initial.md) | State | Initial state (before the first commit) |
|  [mutators](./paramodel.statedefinition.mutators.md) | [StateChangeHandlers](./paramodel.statechangehandlers.md)<!-- -->&lt;Pick&lt;Events, Mutators\[number\]&gt;, State, Pick&lt;Views, Dependencies\[number\]&gt;&gt; | An object that define the change event handlers that may mutate the defined state.<!-- -->Each key in this object is the name of a change event and the corresponding value is an [StateApplyFunc](./paramodel.stateapplyfunc.md) that shall be invoked to apply the effect of that change. |
|  [type](./paramodel.statedefinition.type.md) | Type&lt;State&gt; | State type |
