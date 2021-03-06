<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [paramodel](./paramodel.md) &gt; [FilterOperand](./paramodel.filteroperand.md)

## FilterOperand type

A type alias that represents a filter operand for a given property type and operator

<b>Signature:</b>

```typescript
export declare type FilterOperand<T, O> = (O extends IsOperator ? IsOperand<T> : O extends EqualityOperator ? T : O extends ComparisonOperator ? T : O extends ArrayAnyOperator ? T : O extends ArrayOperator ? T extends unknown[infer E] ? E : never : O extends StringOperator ? string : never);
```
<b>References:</b> [IsOperator](./paramodel.isoperator.md)<!-- -->, [IsOperand](./paramodel.isoperand.md)<!-- -->, [EqualityOperator](./paramodel.equalityoperator.md)<!-- -->, [ComparisonOperator](./paramodel.comparisonoperator.md)<!-- -->, [ArrayAnyOperator](./paramodel.arrayanyoperator.md)<!-- -->, [ArrayOperator](./paramodel.arrayoperator.md)<!-- -->, [StringOperator](./paramodel.stringoperator.md)

