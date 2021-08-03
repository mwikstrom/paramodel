import { AccountChanges, AccountRegistered } from "./change-model";
import { Change, defineState, StateApplyFunc, StateChangeHandlers } from "../../src";
import { positiveIntegerType } from "paratype";

type State = number;
const initial: State = 1;

const account_registered: StateApplyFunc<Change<AccountRegistered>, State> = async (
    { arg: { account_id } },
    before
) => account_id >= before ? Math.ceil(account_id) + 1 : before;

const on: StateChangeHandlers<AccountChanges, State> = {
    account_registered,
};

export const next_account_id = defineState<State, AccountChanges>(
    positiveIntegerType,
    initial,
    on,
);
