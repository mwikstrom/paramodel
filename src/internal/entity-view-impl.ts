import { positiveIntegerType, recordType, Type } from "paratype";
import { DomainDriver, FilterSpec, OutputRecord } from "../driver";
import { EntityAuthFunc } from "../entity-projection";
import { EntityView, PossibleKeysOf } from "../entity-view";
import { Forbidden } from "../model";
import { FilterOperand, FilterOperator, Page, PageOptions, Queryable, SortDirection } from "../queryable";
import { _QueryImpl } from "./query-impl";
import { _DriverQuerySource } from "./query-source";

/** @internal */
export class _EntityViewImpl<
    T extends {[P in K]: string | number},
    K extends PossibleKeysOf<T>
> implements EntityView<T, K> {
    #query: Queryable<T & {[P in K]: string | number}>;
    #keyProp: K;
    #authResult: undefined | boolean;
    #authFunc: (query: Queryable<T>) => Promise<Queryable<T> | Forbidden>;
    public readonly kind = "entities";
    public readonly version: number;    

    constructor(
        driver: DomainDriver,
        storeId: string,
        type: Type<T>, 
        partitionKey: string,
        keyProp: K,
        version: number,
        authFunc: (query: Queryable<T>) => Promise<Queryable<T> | Forbidden>,
    ) {
        const envelope = envelopeType(type);
        const transform = (record: OutputRecord): T => envelope.fromJsonValue(record.value).entity;
        const source = new _DriverQuerySource(
            driver,
            storeId,
            partitionKey,
            transform,
        );

        const where: readonly FilterSpec[] = Object.freeze([
            {
                path: ["value", "start"],
                operator: "<=",
                operand: version,
            },
            {
                path: ["value", "end"],
                operator: ">",
                operand: version,
            }
        ]);

        this.#query = new _QueryImpl(source, ["value", "entity"], where);
        this.#keyProp = keyProp;
        this.#authFunc = authFunc;
        this.version = version;
    }

    auth = async (): Promise<boolean> => {
        if (this.#authResult === void(0)) {
            const authResult = await this.#authFunc(this.#query);
            if (authResult === Forbidden) {
                this.#authResult = false;
            } else {
                this.#query = authResult;
                this.#authResult = true;
            }
        }
        
        return this.#authResult;
    }

    get = (key: T[K]): Promise<T | undefined> => this.#query.where(this.#keyProp, "==", key).first();

    all = (): AsyncIterable<T> => this.#query.all();
    
    any = async (): Promise<boolean> => this.#query.any();
    
    by = <P extends string & keyof T>(
        property: P,
        direction: SortDirection = "ascending",
    ): Queryable<T> => this.#query.by(property, direction);

    count = (): Promise<number> => this.#query.count();
    
    first = async (): Promise<T | undefined> => this.#query.first();
    
    page = (options: PageOptions = {}): Promise<Page<T>> => this.#query.page(options);

    where = <P extends string & keyof T, O extends FilterOperator<T[P]>>(
        property: P,
        operator: O,
        operand: FilterOperand<T[P], O>
    ): Queryable<T> => this.#query.where(property, operator, operand);
}

type Envelope<T> = {
    start: number;
    end: number;
    entity: T;
};

const envelopeType = <T>(valueType: Type<T>): Type<Envelope<T>> => recordType({
    start: positiveIntegerType,
    end: positiveIntegerType,
    entity: valueType,
});
