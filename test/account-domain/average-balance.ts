import { numberType, recordType } from "paratype";
import { defineQuery, QueryFunc } from "../../src";
import { BaseAccountViews } from "./read-model";

const exec: QueryFunc<Pick<BaseAccountViews, "number_of_accounts" | "total_balance">> = async view => {
    const numberOfAccounts = await (await view("number_of_accounts")).read();
    const totalBalance = await (await view("total_balance")).read();
    return numberOfAccounts > 0 ? totalBalance / numberOfAccounts : 0;
};

export const average_balance = defineQuery(
    numberType,
    recordType({}),
    ["number_of_accounts", "total_balance"],
    exec,
);
