import { JsonValue } from "paratype";
import { FilterOperator, Page, SortDirection } from "./queryable";

export interface DomainDriver {
    init(
        this: this,
        store: string,
    ): Promise<void>;

    count(
        this: this, 
        store: string, 
        partition: string, 
        where?: FilterSpec[],
    ): Promise<number>;

    page(
        this: this,
        store: string,
        partition: string,
        query?: QuerySpec,
    ): Page<DataRecord>;

    read(
        this: this,
        store: string,
        partition: string, 
        key: string,
    ): Promise<DataRecord | undefined>;

    write(
        this: this,
        store: string,
        partition: string,
        key: string,
        value: JsonValue,
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
