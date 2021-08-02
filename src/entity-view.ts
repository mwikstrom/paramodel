import { Queryable } from "./queryable";

export interface EntityView<T = unknown> extends ReadonlyEntityCollection<T> {
    readonly kind: "entities";    
    readonly version: number;
}

export interface ReadonlyEntityCollection<T> extends Queryable<Entity<T>> {
    get(id: number): Promise<Entity<T> | undefined>;
}

export type Entity<T> = T & { id: number };
