import { JsonValue } from "paratype";
import { _MemoryDriver } from "./internal/memory-driver";
import { _defaultTimeSource } from "./internal/time-source";
import { FilterOperator, Page, SortDirection } from "./queryable";

/**
 * An underlying driver for a domain model
 * @public
 */
export interface DomainDriver {
    /**
     * Intializes a domain store for usage. This function must be idempotent as it
     * may be invoked several times for a single domain store.
     * @param this - <i>(Ignored)</i> This method uses implicit `this` binding
     * @param store - Identifies the domain store that shall be initialized
     */
    init(
        this: void,
        store: string,
    ): Promise<void>;

    /**
     * Returns a provies that resolves with the number of data records that matches the 
     * specified filter in the specified partition and store.
     * @param this - <i>(Ignored)</i> This method uses implicit `this` binding
     * @param store - Identifies the domain store that contains the records to be counted
     * @param partition - Identifies the partition that contains the records to be counted
     * @param where - <i>(Optional)</i> An array of {@link FilterSpec|filters} that selects
     * which records that shall be counted.
     */
    count(
        this: void, 
        store: string, 
        partition: string, 
        where?: readonly FilterSpec[],
    ): Promise<number>;

    /**
     * Returns a promise that resolves with a page of data records from the specified partition and store
     * @param this - <i>(Ignored)</i> This method uses implicit `this` binding
     * @param store - Identifies the domain store that contains the records
     * @param partition - Identifies the partition that contains the records
     * @param query - <i>(Optional)</i> A {@link QuerySpec|query} that selects and sorts
     * the records that shall be returned.
     */
    page(
        this: void,
        store: string,
        partition: string,
        query?: QuerySpec,
    ): Promise<Page<OutputRecord>>;

    /**
     * Returns a promise that resolves with a single data record with the specified key from the 
     * specified domain store and partition, or `undefined` when the record doesn't exist.
     * @param this - <i>(Ignored)</i> This method uses implicit `this` binding
     * @param store - Identifies the domain store that contains the data record
     * @param partition - Identifies the partition that contains the data record
     * @param key - Identifies the data record
     */
    read(
        this: void,
        store: string,
        partition: string, 
        key: string,
    ): Promise<OutputRecord | undefined>;

    /**
     * Gets the current timestamp
     * @param this - <i>(Ignored)</i> This method uses implicit `this` binding
     */
    timestamp(this: void): Date;

    /**
     * Writes a single data record and returns a promise that resolves with the stored record, or
     * `undefined` when the specified {@link InputRecord.replace|replacement token} did not match
     * the required value.
     * @param this - <i>(Ignored)</i> This method uses implicit `this` binding
     * @param store - Identifies the domain store to which the data record shall be written
     * @param partition - Identifies the partition to which the data record shall be written
     * @param input - The data record that shall be written
     */
    write(
        this: void,
        store: string,
        partition: string,
        input: InputRecord,
    ): Promise<OutputRecord | undefined>;
}

/**
 * A data record query specification
 * @public
 */
export interface QuerySpec {
    /**
     * An optional array of {@link FilterSpec|filters} that selects which records that 
     * shall be included in the result
     */
    readonly where?: readonly FilterSpec[];

    /**
     * An optional {@link SortSpec} that defines how data records shall be sorted
     */
    readonly by?: SortSpec;

    /**
     * An optional continuation token that was previously returned by the {@link DomainDriver.page}
     * function
     */
    readonly continuation?: string;

    /**
     * Optionally specifies a hint for the number of items that should be returned
     */
    readonly size?: number;
}

/**
 * Specifies how data records shall be sorted
 * @public
 */
export interface SortSpec {
    /**
     * Path to the property that records shall be sorted by
     */
    readonly path: readonly string[];

    /**
     * Specifies in which direction records shall be sorted
     */
    readonly direction: SortDirection;
}

/**
 * Specifies a data record filter condition
 * @public
 */
export interface FilterSpec {
    /**
     * Path to the property that records shall be filtered by
     */
    readonly path: readonly string[];

    /**
     * The filter condition operator
     */
    readonly operator: FilterOperator<JsonValue>;

    /**
     * The filter condition operand
     */
    readonly operand: JsonValue;
}

/**
 * A data record to be written
 * @public
 */
export interface InputRecord {
    /** Key of the data record */
    readonly key: string;

    /** Value of the data record */
    readonly value: JsonValue;

    /**
     * A replacement token. Must be the value of the existing data record's token or `null` when there is no existing
     * data record with the same key.
     */
    readonly replace: string | null;

    /**
     * The data record's time to live (TTL) measured in seconds.
     * 
     * - Specify `0` to delete an existing data record
     * 
     * - Specify `-1` to let the newly written data record remain forever
     */
    readonly ttl: number;
}

/**
 * A data record as returned from a {@link DomainDriver|driver}
 * @public
 */
export type OutputRecord = {
    /** Key of the data record */
    readonly key: string;

    /** Value of the data record */
    readonly value: JsonValue;

    /** An opaque token that shall be used to replace the data record */
    readonly token: string;

    /** The data record's time to live (TTL) measured in seconds, or `-1` when the data record will remain forever */
    readonly ttl: number;

    /** The timestamp when the data record was last written */
    readonly timestamp: number;
}

/**
 * Creates an in-memory {@link DomainDriver|driver} that could be used to testing your domain
 * @param this - <i>(Ignored)</i> This method uses implicit `this` binding
 * @public
 */
export function createMemoryDriver(this: void): DomainDriver {
    return new _MemoryDriver(_defaultTimeSource);
}