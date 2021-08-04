import { InputRecord, OutputRecord } from "../driver";
import { _TimeSource } from "./time-source";

/** @internal */
export class _MemoryPartition {
    readonly #time: _TimeSource;
    readonly #records = new Map<string, StoredRecord>();

    constructor(time: _TimeSource) {
        this.#time = time;
    }

    all = (): readonly OutputRecord[] => {
        throw new Error("TODO: Method not implemented.");
    }

    read = (key: string): OutputRecord | undefined => {
        throw new Error("TODO: Method not implemented.");
    }

    write = (input: InputRecord): boolean => {
        throw new Error("TODO: Method not implemented.");
    }
}

type StoredRecord = Omit<OutputRecord, "key">;