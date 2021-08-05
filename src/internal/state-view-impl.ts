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

    public readonly kind = "state";
    public readonly version: number;

    constructor(
        driver: DomainDriver,
        storeId: string,
        type: Type<T>, 
        partitionKey: string,
        rowKey: string,
        version: number,
    ) {
        this.#driver = driver;
        this.#storeId = storeId;
        this.#type = type;
        this.#partitionKey = partitionKey;
        this.#rowKey = rowKey;
        this.version = version;
    }

    read = async (): Promise<T> => {
        const data = await this.#driver.read(this.#storeId, this.#partitionKey, this.#rowKey);
        
        if (!data) {
            throw new Error(`State not found: ${this.#storeId}/${this.#partitionKey}/${this.#rowKey}`);
        }

        return this.#type.fromJsonValue(data.value);
    }
}
