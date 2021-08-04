import { DomainDriver, FilterSpec, OutputRecord, QuerySpec } from "../driver";
import { Page } from "../queryable";

/** @internal */
export interface _QuerySource<T> {
    count(
        this: void, 
        where: readonly FilterSpec[],
    ): Promise<number>;

    page(
        this: void,
        query: QuerySpec,
    ): Promise<Page<T>>;
}

/** @internal */
export class _DriverQuerySource<T> implements _QuerySource<T> {
    readonly #driver: DomainDriver;
    readonly #store: string;
    readonly #partition: string;
    readonly #transform: _OutputRecordTransform<T>;

    constructor(driver: DomainDriver, store: string, partition: string, transform: _OutputRecordTransform<T>) {
        this.#driver = driver;
        this.#store = store;
        this.#partition = partition;
        this.#transform = transform;        
    }

    count = async (where: readonly FilterSpec[]): Promise<number> => this.#driver.count(
        this.#store,
        this.#partition,
        where,
    );

    page = async (query: QuerySpec): Promise<Page<T>> => {
        const { items, ...rest } = await this.#driver.page(this.#store, this.#partition, query);
        const result: Page<T> = {
            items: items.map(this.#transform),
            ...rest
        };
        return result;
    }
}

/** @internal */
export type _OutputRecordTransform<T> = (output: OutputRecord) => T;
