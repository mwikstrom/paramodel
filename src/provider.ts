import { DomainModel } from "./model";
import { DomainStore } from "./store";

// TODO: Domain call context: user auth stuff (expose in action and view handlers)
export interface DomainStoreProvider {
    get<Model extends DomainModel>(
        id: string, 
        model: Model,
    ): DomainStore<Model>;
}
