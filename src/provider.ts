import { DomainModel } from "./model";
import { DomainStore } from "./store";

// TODO: DomainContext: user auth stuff (expose in action and view handlers)
export interface DomainStoreProvider {
    get<Model extends DomainModel>(
        id: string, 
        model: Model,
    ): DomainStore<Model>;
}
