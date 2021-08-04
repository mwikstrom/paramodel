import { JsonValue } from "paratype";
import { _MemoryDriver } from "./internal/memory-driver";
import { _defaultTimeSource } from "./internal/time-source";
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
        where?: readonly FilterSpec[],
    ): Promise<number>;

    page(
        this: void,
        store: string,
        partition: string,
        query?: QuerySpec,
    ): Promise<Page<OutputRecord>>;

    read(
        this: void,
        store: string,
        partition: string, 
        key: string,
    ): Promise<OutputRecord | undefined>;

    write(
        this: void,
        store: string,
        partition: string,
        input: InputRecord,
    ): Promise<boolean>;
}

export interface QuerySpec {
    readonly where?: readonly FilterSpec[];
    readonly by?: SortSpec;
    readonly continuation?: string;
    readonly size?: number;
}

export interface SortSpec {
    readonly path: readonly string[];
    readonly direction: SortDirection;
}

export interface FilterSpec {
    readonly path: readonly string[];
    readonly operator: FilterOperator<JsonValue>;
    readonly operand: JsonValue;
}

export interface InputRecord {
    readonly key: string;
    readonly value: JsonValue;
    readonly replace: string | null;
    readonly ttl: number;
}

export type OutputRecord = {
    readonly key: string;
    readonly value: JsonValue;
    readonly token: string;
    readonly ttl: number;
    readonly timestamp: number;
}

export function createMemoryDriver(): DomainDriver {
    return new _MemoryDriver(_defaultTimeSource);
}