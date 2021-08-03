import { AccountChanges, AccountDeleted, AccountRegistered } from "./change-model";
import { Change, defineState, StateApplyFunc, StateChangeHandlers } from "../../src";
import { nonNegativeIntegerType } from "paratype";

type State = number;
const initial: State = 0;

const account_registered: StateApplyFunc<Change<AccountRegistered>, State> = async (
    _,
    before
) => before + 1;

const account_deleted: StateApplyFunc<Change<AccountDeleted>, State> = async (
    _,
    before
) => before - 1;

const on: StateChangeHandlers<AccountChanges, State> = {
    account_registered,
    account_deleted,
};

export const number_of_accounts = defineState<State, AccountChanges>(
    nonNegativeIntegerType,
    initial,
    on,
);
