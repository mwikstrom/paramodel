import { TypeOf } from "paratype";
import { DomainDriver } from "./driver";
import { _ProviderImpl } from "./internal/provider-impl";
import { DomainModel } from "./model";
import { DomainStore } from "./store";

/**
 * Provides access to {@link DomainStore|domain stores}.
 * @public
 */
export interface DomainProvider {
    get<Model extends DomainModel>(
        this: void,
        id: string, 
        model: Model,
        scope: TypeOf<Model["scope"]>,
    ): Promise<DomainStore<Model>>;
}

/**
 * Creates a {@link DomainProvider} for the specified driver
 * @param this - <i>(Ignored)</i> This function uses implicit `this` binding
 * @param driver - The driver that shall be used by the new provider
 * @public
 */
export function createDomainProvider(this: void, driver: DomainDriver): DomainProvider {
    return new _ProviderImpl(driver);
}
