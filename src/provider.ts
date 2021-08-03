import { TypeOf } from "paratype";
import { DomainModel } from "./model";
import { DomainStore } from "./store";

export interface DomainStoreProvider {
    get<Model extends DomainModel>(
        this: void,
        id: string, 
        model: Model,
        scope: TypeOf<Model["scope"]>,
    ): Promise<DomainStore<Model>>;
}
