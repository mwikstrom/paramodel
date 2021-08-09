import { recordType, positiveIntegerType, numberType } from "paratype";
import { defineAction } from "../../src";
import { AccountAction } from "./write-model";

export type TransferMoney = {
    from_account_id: number,
    to_account_id: number,
    amount: number;
};

const inputType = recordType<TransferMoney>({
    from_account_id: positiveIntegerType,
    to_account_id: positiveIntegerType,
    amount: numberType,
}).restrict("Amount must be greater than zero", input => input.amount > 0);

const exec: AccountAction<"accounts", TransferMoney> = async ({
    scope: { user_id }, 
    input: { from_account_id, to_account_id, amount },
    forbidden,
    conflict,
    emit,
    view,
}) => {
    const accounts = await view("accounts");
    const from = await accounts.get(from_account_id);
    const to = await accounts.get(to_account_id);
    if (!from || from.owner_id !== user_id) {
        return forbidden();
    }
    if (!to || from.balance < amount) {
        return conflict();
    }
    if (from_account_id !== to_account_id) {
        emit("money_transferred", { from_account_id, to_account_id, amount });
    }
};

export const transfer_money = defineAction({
    input: inputType,
    exec,
    dependencies: ["accounts"],
});
