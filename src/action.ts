import { Type, TypeOf } from "paratype";
import { Commit } from "./commit";
import { EventsDomain, ProjectionsDomain } from "./domain";
import { Snapshot } from "./snapshot";

/** @public */
export interface Action<D extends ProjectionsDomain, I extends Type<any>, O extends Type<any> = Type<void>> {
    input: I;
    output?: O;
    run: ActionRunner<D, I, O>,
}

/** @public */
export type ActionRunner<D extends ProjectionsDomain, I extends Type<any>, O extends Type<any> = Type<void>> = (
    context: ActionContext<D, TypeOf<I>>
) => Promise<TypeOf<O>>;

/** @public */
export interface ActionContext<D extends ProjectionsDomain, T> {
    readonly base: Snapshot<D>;
    readonly commit: Commit<TypeOf<D["meta"]>>;
    readonly input: T;
    readonly emit: Emitter<D>;
    conflict(message?: string): void;
    conflict(when: boolean): void;
    conflict(when: boolean, message: string): void;
}

/** @public */
export type Emitter<D extends EventsDomain> = {
    [P in keyof D["events"]]: (arg: TypeOf<D["events"][P]>) => void;
};

/** @public */
export interface ActionResult<D extends ProjectionsDomain, T> {
    readonly snapshot: Snapshot<D>;
    readonly result: T;
}
