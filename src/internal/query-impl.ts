import { FilterSpec, QuerySpec, SortSpec } from "../driver";
import { 
    FilterOperand, 
    FilterOperator, 
    Page, 
    PageOptions, 
    Queryable, 
    SortDirection, 
} from "../queryable";
import { _QuerySource } from "./query-source";

/** @internal */
export class _QueryImpl<T> implements Queryable<T> {
    readonly #source: _QuerySource<T>;
    readonly #path: readonly string[];
    readonly #where: readonly FilterSpec[];
    readonly #by?: SortSpec;

    constructor(
        source: _QuerySource<T>,
        path: readonly string[],
        where: readonly FilterSpec[] = [],
        by?: SortSpec,
    ) {
        this.#source = source;
        this.#path = path;
        this.#where = where;
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
    ): Queryable<T> => new _QueryImpl<T>(
        this.#source,
        this.#path,
        this.#where,
        { path: [...this.#path, property ], direction }        
    );

    count = (): Promise<number> => {       
        if (!this.#by) {
            return this.#source.count(this.#where);
        }

        // having a sort spec means that items that does not have the
        // property path that is being sorted by will be filtered out

        const where: FilterSpec[] = [
            ...this.#where,
            {
                path: this.#by.path,
                operator: "is",
                operand: "scalar",
            }
        ];

        return this.#source.count(where);
    }
    
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
    
    page = (options: PageOptions = {}): Promise<Page<T>> => {
        const { continuation, size } = options;
        const spec: QuerySpec = {
            where: this.#where,
            by: this.#by,
            continuation,
            size,
        };
        return this.#source.page(spec);
    }

    where = <P extends string & keyof T, O extends FilterOperator<T[P]>>(
        property: P,
        operator: O,
        operand: FilterOperand<T[P], O>
    ): Queryable<T> => new _QueryImpl<T>(
        this.#source,
        this.#path,
        [...this.#where, { path: [...this.#path, property], operator, operand }],
        this.#by,
    );
}
