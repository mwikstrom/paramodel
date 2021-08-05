import { JsonValue, TypeOf } from "paratype";
import { ActionResult } from "../action";
import { ActionContext } from "../action-context";
import { ActionHandler } from "../action-handler";
import { Change } from "../change";
import { ChangeModel, Conflict, Forbidden, ReadModel } from "../model";
import { ViewOf, ViewSnapshotFunc } from "../projection";

/** @internal */
export class _ActionContextImpl<
    Events extends ChangeModel,
    Views extends ReadModel,
    Scope = unknown,
    Input = unknown,
    Output = unknown,
> implements ActionContext<Events, Views, Scope, Input, Output> {
    #active = true;
    #events: Events;
    #handler: ActionHandler<Events, Views, Scope, Input, Output>;
    #output: Output | undefined;
    #status: ActionResult["status"] | undefined;
    #message: ActionResult["message"];
    #emittedEvents: Omit<Change<JsonValue>, "version" | "timestamp" | "position">[] = [];
    #emittedChanges = new Set<string>();
    #snapshot: ViewSnapshotFunc<Views>;

    constructor(
        public readonly version: number,
        public readonly timestamp: Date,
        public readonly input: Input,
        public readonly scope: Scope,
        events: Events,
        handler: ActionHandler<Events, Views, Scope, Input, Output>,
        snapshot: ViewSnapshotFunc<Views>,
    ) {
        this.#events = events;
        this.#handler = handler;
        this.#snapshot = snapshot;
    }

    #fail = <T>(symbol: T, status: ActionResult["status"], message?: string): T => {
        if (this.#active) {
            this.#status = status;
            this.#message = message;
        }
        return symbol;
    }

    _run = async (): Promise<_ActionContextRunResult<Output>> => {
        if (!this.#active) {
            throw new Error("Action context can only run once");
        }

        try {
            const symbol = await this.#handler.exec(this);

            if (symbol === void(0) && this.#status === void(0)) {
                this.#status = "success";
                this.#message = void(0);
            } else if (symbol === Forbidden) {
                this.#status = "forbidden";
                this.#message = void(0);
            } else if (symbol === Conflict) {
                this.#status = "forbidden";
                this.#message = void(0);
            } else {
                this.#status = "failed";
                this.#message = "Action handled returned unknown symbol";
            }            
        } catch (e) {
            if (this.#status === void(0) || this.#status === "success") {
                this.#status = "failed";
                this.#message = e instanceof Error ? e.message : void(0);
            }
        } finally {
            this.#active = false;
        }        

        if (this.#status !== "success") {
            this.#emittedChanges.clear();
            this.#emittedEvents.splice(0, this.#emittedEvents.length);
            this.#output = void(0);
        }

        const result: _ActionContextRunResult<Output> = {
            changes: Array.from(this.#emittedChanges),
            events: [...this.#emittedEvents],
            status: this.#status,
            message: this.#message,
            output: this.#output,
        };

        return result;
    }

    forbidden = (message?: string): Forbidden => this.#fail(Forbidden, "forbidden", message);

    conflict = (message?: string): Conflict => this.#fail(Conflict, "conflict", message);

    output = (result: Output): void => {
        if (!this.#active) {
            return void(0);
        }

        const typeError = this.#handler.output.error(result);
        if (typeError !== void(0)) {
            throw new Error(`Invalid action output: ${typeError}`);
        }

        this.#output = result;
    }

    emit = <K extends string & keyof Events>(key: K, arg: TypeOf<Events[K]>): void => {
        if (!this.#active) {
            return void(0);
        }
 
        if (!(key in this.#events)) {
            throw new Error(`Cannot emit unknown event: ${key}`);
        }

        const eventType = this.#events[key];
        const typeError = eventType.error(arg);
        if (typeError !== void(0)) {
            throw new Error(`Invalid argument for event '${key}': ${typeError}`);
        }

        const jsonArg = eventType.toJsonValue(arg);
        if (jsonArg == void(0)) {
            throw new Error(`Argument for event '${key}' could not be converted to json`);
        }

        this.#emittedChanges.add(key);
        this.#emittedEvents.push({ key, arg: jsonArg });
    }

    view = <K extends string & keyof Views>(key: K): Promise<ViewOf<Views[K]>> => this.#snapshot(key);
}

/** @internal */
export type _ActionContextRunResult<Output> = {
    changes: readonly string[];
    events: readonly Omit<Change<JsonValue>, "version" | "timestamp" | "position">[];
    status: "success" | "conflict" | "forbidden" | "aborted" | "rejected" | "failed";
    message: string | undefined;
    output: Output | undefined;
};