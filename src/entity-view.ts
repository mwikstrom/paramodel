import { Queryable } from "./queryable";

export interface EntityView<T, K extends PossibleKeysOf<T>> extends ReadonlyEntityCollection<T, K> {
    readonly kind: "entities";
    readonly version: number;
    auth(this: void): Promise<boolean>;
}

export interface ReadonlyEntityCollection<T, K extends PossibleKeysOf<T>> extends Queryable<T> {
    get(this: void, key: T[K]): Promise<T | undefined>;
}

export type PossibleKeysOf<T> = {
    [P in keyof T]: T[P] extends (string | number) ? P extends string ? P : never : never;
}[keyof T];
