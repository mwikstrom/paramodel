/** @internal */
export interface _TimeSource {
    now(this: void): number;
}

/** @internal */
export const _defaultTimeSource: _TimeSource = { now: Date.now };
