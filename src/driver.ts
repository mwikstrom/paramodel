import { JsonValue } from "paratype";
import { _MemoryDriver } from "./internal/memory-driver";
import { FilterOperator, Page, SortDirection } from "./queryable";

export interface DomainDriver {
    init(
        this: void,
        store: string,
    ): Promise<void>;

    count(
        this: void, 
        store: string, 
        partition: string, 
        where?: FilterSpec[],
    ): Promise<number>;

    page(
        this: void,
        store: string,
        partition: string,
        query?: QuerySpec,
    ): Promise<Page<DataRecord>>;

    read(
        this: void,
        store: string,
        partition: string, 
        key: string,
    ): Promise<DataRecord | undefined>;

    write(
        this: void,
        store: string,
        partition: string,
        key: string,
        value: JsonValue | undefined,
        token: string | null,
    ): Promise<string | undefined>;
}

export interface QuerySpec {
    readonly where: readonly FilterSpec[];
    readonly direction: SortDirection;
    readonly continuation?: string;
    readonly by?: string;
    readonly size?: number;
}

export interface FilterSpec {
    readonly property: string;
    readonly operator: FilterOperator<JsonValue>;
    readonly operand: JsonValue;
}

export interface DataRecord {
    readonly value: JsonValue;
    readonly token: string;
}

export function createMemoryDriver(): DomainDriver {
    return new _MemoryDriver();
}