import { positiveIntegerType, recordType, Type } from "paratype";
import { DomainDriver, FilterSpec, OutputRecord } from "../driver";
import { EntityView, PossibleKeysOf } from "../entity-view";
import { Queryable } from "../queryable";
import { _QueryImpl } from "./query-impl";
import { _DriverQuerySource } from "./query-source";

/** @internal */
export class _EntityViewImpl<T, K extends PossibleKeysOf<T>> extends _QueryImpl<T> implements EntityView<T, K> {
    #keyProp: K;
    public readonly kind = "entities";
    public readonly version: number;

    constructor(
        driver: DomainDriver,
        storeId: string,
        type: Type<T>, 
        partitionKey: string,
        keyProp: K,
        version: number,
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

        super(source, ["value", "entity"], where);
        this.#keyProp = keyProp;
        this.version = version;
    }

    get = (key: T[K]): Promise<T | undefined> => (
        (this as Queryable<T & {[P in K]: string | number}>)
            .where(this.#keyProp, "==", key)
            .first()
    );
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
