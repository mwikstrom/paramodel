import { positiveIntegerType, recordType, Type } from "paratype";
import { DomainDriver, FilterSpec, OutputRecord } from "../driver";
import { EntityView } from "../entity-view";
import { Queryable } from "../queryable";
import { _QueryImpl } from "./query-impl";
import { _DriverQuerySource } from "./query-source";

/** @internal */
export class _EntityViewImpl<T, K extends keyof T> extends _QueryImpl<T> implements EntityView<T, K> {
    public readonly kind = "entities";
    public readonly version: number;

    constructor(
        driver: DomainDriver,
        storeId: string,
        type: Type<T>, 
        partitionKey: string,
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
        this.version = version;
    }

    get = (key: Pick<T, K>): Promise<T | undefined> => {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q = this as Queryable<any>;

        for (const [prop, value] of Object.entries(key)) {
            q = q.where(prop, "==", value);
        }

        return q.first();
    }
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
