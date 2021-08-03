import { TypeOf } from "paratype";
import { DomainDriver } from "./driver";
import { _ProviderImpl } from "./internal/provider-impl";
import { DomainModel } from "./model";
import { DomainStore } from "./store";

export interface DomainProvider {
    get<Model extends DomainModel>(
        this: void,
        id: string, 
        model: Model,
        scope: TypeOf<Model["scope"]>,
    ): Promise<DomainStore<Model>>;
}

export function createDomainProvider(driver: DomainDriver): DomainProvider {
    return new _ProviderImpl(driver);
}
