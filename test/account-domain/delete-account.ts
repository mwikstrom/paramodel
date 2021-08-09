import { recordType, positiveIntegerType } from "paratype";
import { defineAction } from "../../src";
import { AccountAction } from "./write-model";

export type DeleteAccount = {
    account_id: number,
};

const inputType = recordType<DeleteAccount>({
    account_id: positiveIntegerType,
});

const exec: AccountAction<"accounts", DeleteAccount> = async ({
    scope: { user_id }, 
    input: { account_id },
    forbidden,
    conflict,
    emit,
    view,
}) => {
    const found = await (await view("accounts")).get(account_id);
    if (!found || found.owner_id !== user_id) {
        return forbidden();
    }
    if (found.balance !== 0) {
        return conflict();
    }
    emit("account_deleted", { account_id });
};

export const delete_account = defineAction({
    input: inputType,
    exec,
    dependencies: ["accounts"],
});
