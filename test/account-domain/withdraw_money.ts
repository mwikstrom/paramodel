import { recordType, positiveIntegerType, numberType } from "paratype";
import { defineAction } from "../../src";
import { AccountAction } from "./write-model";

export type WithdrawMoney = {
    account_id: number,
    amount: number;
};

const inputType = recordType<WithdrawMoney>({
    account_id: positiveIntegerType,
    amount: numberType,
}).restrict("Amount must be greater than zero", input => input.amount > 0);

const exec: AccountAction<"accounts", WithdrawMoney> = async ({
    scope: { user_id }, 
    input: { account_id, amount },
    forbidden,
    conflict,
    emit,
    view,
}) => {
    const found = await (await view("accounts")).get(account_id);

    if (!found) {
        return conflict("Account does not exist");
    }

    if (found.owner_id !== user_id) {
        return forbidden("Only account owner is allowed to withdraw money");
    }

    if (found.balance < amount) {
        return conflict("Insufficient funds");
    }

    emit("money_withdrawn", { account_id, amount });
};

export const withdraw_money = defineAction(
    inputType,
    exec,
    ["accounts"],
);
