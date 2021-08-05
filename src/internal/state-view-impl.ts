import { Type } from "paratype";
import { DomainDriver } from "../driver";
import { StateView } from "../state-view";

/** @internal */
export class _StateViewImpl<T> implements StateView<T> {
    readonly #driver: DomainDriver;
    readonly #storeId: string;
    readonly #type: Type<T>
    readonly #partitionKey: string;
    readonly #rowKey: string;
    readonly #auth: (state: T) => Promise<T>;

    public readonly kind = "state";
    public readonly version: number;

    constructor(
        driver: DomainDriver,
        storeId: string,
        type: Type<T>, 
        partitionKey: string,
        rowKey: string,
        version: number,
        auth: (state: T) => Promise<T>,
    ) {
        this.#driver = driver;
        this.#storeId = storeId;
        this.#type = type;
        this.#partitionKey = partitionKey;
        this.#rowKey = rowKey;
        this.version = version;
        this.#auth = auth;
    }

    read = async (): Promise<T> => {
        const data = await this.#driver.read(this.#storeId, this.#partitionKey, this.#rowKey);
        
        if (!data) {
            throw new Error(`State not found: ${this.#storeId}/${this.#partitionKey}/${this.#rowKey}`);
        }

        const mapped = this.#type.fromJsonValue(data.value);
        const authed = await this.#auth(mapped);
        return authed;
    }
}
