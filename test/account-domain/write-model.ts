import { ActionFunc } from "../../src";
import { AccessScope } from "./access-scope";
import { AccountChanges } from "./change-model";
import { AccountViews } from "./read-model";
import { register_account } from "./register-account";
import { delete_account } from "./delete-account";
import { deposit_money } from "./deposit-money";
import { withdraw_money } from "./withdraw_money";
import { transfer_money } from "./transfer_money";

export type AccountAction<K extends keyof AccountViews, Input, Output = void> = ActionFunc<
    AccountChanges,
    Pick<AccountViews, K>,
    AccessScope,
    Input,
    Output
>;

export const accountActions = {
    register_account,
    delete_account,
    deposit_money,
    withdraw_money,
    transfer_money,
};

export type AccountActions = typeof accountActions;
