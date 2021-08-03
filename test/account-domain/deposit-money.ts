import { recordType, positiveIntegerType, numberType } from "paratype";
import { defineAction } from "../../src";
import { AccountAction } from "./write-model";

export type DepositMoney = {
    account_id: number,
    amount: number;
};

const inputType = recordType<DepositMoney>({
    account_id: positiveIntegerType,
    amount: numberType,
}).restrict("Amount must be greater than zero", input => input.amount > 0);

const exec: AccountAction<"accounts", DepositMoney> = async ({
    scope: { user_id }, 
    input: { account_id, amount },
    forbidden,
    emit,
    view,
}) => {
    const found = await (await view("accounts")).get(account_id);
    if (!found || found.owner_id !== user_id) {
        forbidden();
    }
    emit("money_deposited", { account_id, amount });
};

export const deposit_money = defineAction(
    inputType,
    exec,
    ["accounts"],
);
