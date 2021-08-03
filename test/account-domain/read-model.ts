import { accounts } from "./account-entities";
import { next_account_id } from "./next-account-id";
import { number_of_accounts } from "./number-of-accounts";
import { total_balance } from "./total-balance";
import { average_balance } from "./average-balance";

export const baseAccountViews = {
    accounts,
    next_account_id,
    number_of_accounts,
    total_balance,
};

export const accountViews = {
    ...baseAccountViews,
    average_balance,
};

export type BaseAccountViews = typeof baseAccountViews;
export type AccountViews = typeof accountViews;
