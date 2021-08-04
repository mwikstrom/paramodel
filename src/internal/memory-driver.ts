import { DomainDriver, FilterSpec, InputRecord, OutputRecord, QuerySpec } from "../driver";
import { Page } from "../queryable";
import { _compileComparison } from "./compile-comparison";
import { _compilePredicate } from "./compile-predicate";
import { _MemoryPartition } from "./memory-partition";
import { _TimeSource } from "./time-source";

/** @internal */
export class _MemoryDriver implements DomainDriver {
    readonly #time: _TimeSource;
    readonly #data = new Map<string, Map<string, _MemoryPartition>>();
    readonly #items = (store: string, partition: string): _MemoryPartition => {
        let partitions = this.#data.get(store);
        if (!partitions) {
            this.#data.set(store, partitions = new Map());
        }
        let items = partitions.get(partition);
        if (!items) {
            partitions.set(partition, items = new _MemoryPartition(this.#time));
        }
        return items;
    }

    constructor(time: _TimeSource) {
        this.#time = time;
    }

    init = async (): Promise<void> => {
        // no-op
    }

    count = async (store: string, partition: string, where: FilterSpec[] = []): Promise<number> => {
        const predicate = _compilePredicate(where);
        return this.#items(store, partition).all().filter(predicate).length;
    }

    page = async (store: string, partition: string, query: QuerySpec = {}): Promise<Page<OutputRecord>> => {
        const { where, by, size, continuation } = query;
        const predicate = _compilePredicate(where || []);
        let items = this.#items(store, partition).all().filter(predicate);

        if (by) {
            items.sort(_compileComparison(by));
        }

        let skip = 0;

        if (typeof continuation === "string") {
            skip = parseInt(continuation, 10);

            if (!Number.isSafeInteger(skip) || skip > items.length) {
                throw new RangeError("Invalid continuation token");
            }

            items = items.slice(skip);
        }

        if (typeof size !== "number") {
            return { items };
        }

        return { items: items.slice(0, size), continuation: (skip + size).toString(10) };
    }
    
    read = async (
        store: string, 
        partition: string, 
        key: string,
    ): Promise<OutputRecord | undefined> => this.#items(store, partition).read(key);

    write = async (
        store: string, 
        partition: string, 
        input: InputRecord,
    ): Promise<boolean> => this.#items(store, partition).write(input);
}

