import { Domain } from "./domain";
import { EventStream } from "./stream";

/** @public */
export interface EventStore {
    stream<D extends Domain>(this: void, id: string, domain: D): EventStream<D>;
}
