import { TypeOf } from "paratype";
import { DomainDriver } from "../driver";
import { DomainModel } from "../model";
import { DomainProvider } from "../provider";
import { DomainStore } from "../store";
import { _StoreImpl } from "./store-impl";

/** @internal */
export class _ProviderImpl implements DomainProvider {
    readonly #driver: DomainDriver;
    readonly #init = new Map<string, Promise<void> | typeof INIT_DONE>();

    constructor(driver: DomainDriver) {
        this.#driver = driver;
    }

    get = async <Model extends DomainModel>(
        id: string, 
        model: Model, 
        scope: TypeOf<Model["scope"]>
    ): Promise<DomainStore<Model>> => {
        const promise = this.#init.get(id) || this.#driver.init(id);

        if (promise !== INIT_DONE) {
            await promise;
            this.#init.set(id, INIT_DONE);
        }

        return new _StoreImpl(this.#driver, id, model, scope);
    }

}

const INIT_DONE = Symbol();
