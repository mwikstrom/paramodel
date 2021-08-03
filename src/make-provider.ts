import { DomainDriver } from "./driver";
import { _makeStore } from "./internal/make-store";
import { DomainStoreProvider } from "./provider";

export function makeProvider(driver: DomainDriver): DomainStoreProvider {
    const init = new Map<string, Promise<void> | typeof INIT_DONE>();
    const get: DomainStoreProvider["get"] = async (id, model, scope) => {
        const promise = init.get(id) || driver.init(id);

        if (promise !== INIT_DONE) {
            await promise;
            init.set(id, INIT_DONE);
        }

        return _makeStore(driver, id, model, scope);
    };

    return Object.freeze({ get });
}

const INIT_DONE = Symbol();
