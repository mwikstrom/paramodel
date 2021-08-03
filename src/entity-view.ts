import { Queryable } from "./queryable";

export interface EntityView<T, K extends keyof T> extends ReadonlyEntityCollection<T, K> {
    readonly kind: "entities";
    readonly version: number;
}

export interface ReadonlyEntityCollection<T, K extends keyof T> extends Queryable<T> {
    get(key: Pick<T, K>): Promise<T | undefined>;
}

