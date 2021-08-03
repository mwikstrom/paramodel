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
    where: FilterSpec[];
    continuation?: string;
    by?: SortSpec;
    size?: number;
}

export interface SortSpec {
    property: string;
    direction: SortDirection;
}

export interface FilterSpec {
    property: string;
    operator: FilterOperator<JsonValue>;
    operand: JsonValue;
}

export interface DataRecord {
    value: JsonValue;
    token: string;
}

export function createMemoryDriver(): DomainDriver {
    return new _MemoryDriver();
}