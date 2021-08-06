import { Queryable } from "./queryable";

export interface EntityView<
    T extends Record<string, unknown> = Record<string, unknown>,
    K extends PossibleKeysOf<T> = PossibleKeysOf<T>
> extends ReadonlyEntityCollection<T, K> {
    readonly kind: "entities";
    readonly version: number;
}

export interface ReadonlyEntityCollection<T, K extends PossibleKeysOf<T>> extends Queryable<T> {
    get(this: void, key: T[K]): Promise<T | undefined>;
}

export type PossibleKeysOf<T> = {
    [P in keyof T]: T[P] extends (string | number | unknown) ? P extends string ? P : never : never;
}[keyof T];
