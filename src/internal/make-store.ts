import { TypeOf } from "paratype";
import { DomainStore } from "../store";
import { DomainModel } from "../model";
import { DomainDriver } from "../driver";

/** @internal */
export const _makeStore = <Model extends DomainModel>(
    driver: DomainDriver, 
    store: string, 
    model: Model, 
    scope: TypeOf<Model["scope"]>,
): DomainStore<Model> => {
    const result: DomainStore<Model> = {
        changes: undefined as any, // TODO: makeChanges,
        do: undefined as any, // TODO: makeDo
        stat: undefined as any, // TODO: makeStat
        sync: undefined as any, // TODO: makeSync
        view: undefined as any, // TODO: makeView
    };

    return Object.freeze(result);
};
