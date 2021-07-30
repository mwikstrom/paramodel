import { DomainModel } from "./model";
import { DomainStore } from "./store";

export interface DomainStoreProvider {
    get<Model extends DomainModel>(
        id: string, 
        model: Model,
        scope: Model["scope"],
    ): DomainStore<Model>;
}
