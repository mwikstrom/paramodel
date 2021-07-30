import { Type } from "paratype";
import { ChangeType } from "./change";
import { ReadonlyEntityCollection } from "./entity-view";
import { ChangeModel, ReadModel } from "./model";
import { ViewSnapshot } from "./projection";

export interface EntityProjection<
    T extends Record<string, unknown> = Record<string, unknown>,
    C extends ChangeModel = ChangeModel,
    R extends ReadModel = ReadModel
> {
    readonly kind: "entities";
    readonly type: Type<T>;
    readonly mutators: ReadonlySet<string & keyof C>;
    readonly dependencies: ReadonlySet<string & keyof R>;
    readonly apply: EntityProjectionFunc<C, R, T>;
}

export type EntityProjectionFunc<
    C extends ChangeModel = ChangeModel,
    R extends ReadModel = ReadModel,
    T extends Record<string, unknown> = Record<string, unknown>,
> = (change: ChangeType<C>, state: EntityCollection<T>, view: ViewSnapshot<R>) => Promise<void>;

export interface EntityCollection<
    T extends Record<string, unknown> = Record<string, unknown>,
> extends ReadonlyEntityCollection<T> {
    put(id: number, props: T): void;
    del(id: number): void;
}
