import { numberType, recordType } from "paratype";
import { defineQuery, QueryExecFunc } from "../../src";
import { BaseAccountViews } from "./read-model";

const exec: QueryExecFunc<Pick<BaseAccountViews, "number_of_accounts" | "total_balance">> = async view => {
    const numberOfAccounts = await (await view("number_of_accounts")).read();
    const totalBalance = await (await view("total_balance")).read();
    return numberOfAccounts > 0 ? totalBalance / numberOfAccounts : 0;
};

export const average_balance = defineQuery({
    type: numberType,
    params: recordType({}),
    dependencies: ["number_of_accounts", "total_balance"],
    exec,
});
