import { InputRecord, OutputRecord } from "../driver";
import { _TimeSource } from "./time-source";

/** @internal */
export class _MemoryPartition {
    readonly #time: _TimeSource;
    readonly #records = new Map<string, StoredRecord>();
    #tokenCounter = 0;

    constructor(time: _TimeSource) {
        this.#time = time;
    }

    #hasExpired = (record: StoredRecord): boolean => {
        const { timestamp, ttl } = record;
        const now = this.#time.now();
        return ttl >= 0 && now >= timestamp + ttl * 1000;
    }

    all = (): readonly OutputRecord[] => {
        const result: OutputRecord[] = [];
        const purge: string[] = [];

        for (const [key, stored] of this.#records) {
            if (this.#hasExpired(stored)) {
                purge.push(key);
            } else {
                result.push({ ...stored, key });
            }
        }

        for (const key of purge) {
            this.#records.delete(key);
        }

        return result;
    }

    read = (key: string): OutputRecord | undefined => {
        const stored = this.#records.get(key);

        if (!stored) {
            return void(0);
        }

        if (this.#hasExpired(stored)) {
            this.#records.delete(key);
            return void(0);
        }
        
        return { ...stored, key };
    }

    write = (input: InputRecord): boolean => {
        const { key, value, replace, ttl } = input;
        const output = this.read(key);

        if ((!output && replace !== null) || (output && replace !== output.token)) {
            return false;
        }

        const token = (++this.#tokenCounter).toString(10);
        const timestamp = this.#time.now();
        const stored: StoredRecord = Object.freeze({ value, token, ttl, timestamp });
        this.#records.set(key, stored);
        return true;
    }
}

type StoredRecord = Omit<OutputRecord, "key">;