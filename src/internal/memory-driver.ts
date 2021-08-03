import { JsonValue } from "paratype";
import { DataRecord, DomainDriver, FilterSpec, QuerySpec } from "../driver";
import { Page } from "../queryable";

/** @internal */
export class _MemoryDriver implements DomainDriver {
    readonly #data = new Map<string, Map<string, Map<string, DataRecord>>>();
    readonly #get = (store: string, partition: string): Map<string, DataRecord> => {
        let partitions = this.#data.get(store);
        if (!partitions) {
            this.#data.set(store, partitions = new Map());
        }
        let items = partitions.get(partition);
        if (!items) {
            partitions.set(partition, items = new Map());
        }
        return items;
    }

    init = async (): Promise<void> => {
        // no-op
    }

    count = async (store: string, partition: string, where?: FilterSpec[]): Promise<number> => {
        throw new Error("TODO: Method not implemented.");
    }

    page = async (store: string, partition: string, query?: QuerySpec): Promise<Page<DataRecord>> => {
        throw new Error("TODO: Method not implemented.");
    }
    
    read = async (store: string, partition: string, key: string): Promise<DataRecord | undefined> => {
        throw new Error("TODO: Method not implemented.");
    }

    write = async (
        store: string, 
        partition: string, 
        key: string, 
        value: JsonValue | undefined, 
        token: string | null
    ): Promise<string | undefined> => {
        throw new Error("TODO: Method not implemented.");
    }
}
