import { Queryable } from "./queryable";

export interface EntityView<
    T extends Record<string, unknown> = Record<string, unknown>
> extends ReadonlyEntityCollection<T> {
    readonly kind: "entities";    
    readonly version: number;
}

export interface ReadonlyEntityCollection<
    T extends Record<string, unknown> = Record<string, unknown>
> extends Queryable<Entity<T>> {
    get(id: number): Promise<Entity<T> | undefined>;
}

export type Entity<
    T extends Record<string, unknown> = Record<string, unknown>
> = T & { id: number };
