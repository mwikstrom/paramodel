import { FilterSpec, QuerySpec } from "../driver";
import { 
    FilterOperand, 
    FilterOperator, 
    Page, 
    PageOptions, 
    Queryable, 
    SortDirection, 
    SortedQueryable 
} from "../queryable";
import { _QuerySource } from "./query-source";

/** @internal */
export class _QueryImpl<T> implements Queryable<T> {
    readonly #source: _QuerySource<T>;
    readonly #where: readonly FilterSpec[];
    readonly #reverse: boolean;
    readonly #by?: string;

    constructor(source: _QuerySource<T>, where: readonly FilterSpec[] = [], reverse = false, by?: string) {
        this.#source = source;
        this.#where = where;
        this.#reverse = reverse;
        this.#by = by;
    }

    all = (): AsyncIterable<T> => {
        const { page } = this;
        return {
            [Symbol.asyncIterator]: async function* iterate() {
                let continuation: string | undefined;
                do {
                    const p = await page({ continuation });
                    for (const item of p.items) {
                        yield item;
                    }
                    continuation = p.continuation;
                } while (continuation !== void(0));
            }
        };
    }
    
    any = async (): Promise<boolean> => {
        const f = await this.first();
        return f !== void(0);
    }
    
    by = <P extends string & keyof T>(
        property: P,
        direction: SortDirection = "ascending",
    ): SortedQueryable<T> => new _QueryImpl<T>(
        this.#source,
        this.#where,
        direction === "descending",
        property,
    );

    count = (): Promise<number> => this.#source.count(this.#where);
    
    first = async (): Promise<T | undefined> => {
        let continuation: string | undefined;
        do {
            const p = await this.page({ size: 1, continuation });
            if (p.items.length > 0) {
                return p.items[0];
            }
            continuation = p.continuation;
        } while (continuation !== void(0));
    }
    
    last = (): Promise<T | undefined> => this.reverse().first();

    page = (options: PageOptions = {}): Promise<Page<T>> => {
        const { continuation, size } = options;
        const spec: QuerySpec = {
            where: this.#where,
            direction: this.#reverse ? "descending" : "ascending",
            continuation,
            by: this.#by,
            size,
        };
        return this.#source.page(spec);
    }

    reverse = (): Queryable<T> => new _QueryImpl<T>(
        this.#source,
        this.#where,
        !this.#reverse,
        this.#by,
    );

    where = <P extends string & keyof T, O extends FilterOperator<T[P]>>(
        property: P,
        operator: O,
        operand: FilterOperand<T[P], O>
    ): SortedQueryable<T> => new _QueryImpl<T>(
        this.#source,
        [...this.#where, { property, operator, operand }],
        this.#reverse,
        this.#by,
    );
}
