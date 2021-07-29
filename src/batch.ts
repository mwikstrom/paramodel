import { TypeOf } from "paratype";
import { ActionsDomain } from "./domain";
import { Snapshot } from "./snapshot";

/** @public */
export interface Batch<D extends ActionsDomain> {
    abort(this: void): void;
    do<K extends keyof D["actions"]>(
        this: void, 
        action: K,
        input: TypeOf<D["actions"][K]["input"]>,
    ): Promise<TypeOf<D["actions"][K]["output"]>>;
    commit(this: void): Promise<Snapshot<D>>;
}
