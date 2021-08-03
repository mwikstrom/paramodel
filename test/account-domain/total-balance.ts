import { AccountChanges, MoneyDeposited, MoneyWithdrawn } from "./change-model";
import { Change, defineState, StateApplyFunc, StateChangeHandlers } from "../../src";
import { numberType } from "paratype";

type State = number;
const initial: State = 0;

const money_deposited: StateApplyFunc<Change<MoneyDeposited>, State> = async (
    { arg: { amount } },
    before
) => before + amount;

const money_withdrawn: StateApplyFunc<Change<MoneyWithdrawn>, State> = async (
    { arg: { amount } },
    before
) => before - amount;

const on: StateChangeHandlers<AccountChanges, State> = {
    money_deposited,
    money_withdrawn,
};

export const total_balance = defineState<State, AccountChanges>(
    numberType,
    initial,
    on,
);
