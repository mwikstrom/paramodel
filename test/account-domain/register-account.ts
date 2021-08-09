import { positiveIntegerType, recordType, stringType } from "paratype";
import { defineAction } from "../../src";
import { AccountAction } from "./write-model";

export type RegisterAccount = {
    owner_id: string;
};

const inputType = recordType<RegisterAccount>({
    owner_id: stringType,
});

const exec: AccountAction<"next_account_id", RegisterAccount, number> = async ({ 
    scope: { user_id }, 
    input: { owner_id },
    forbidden,
    output,
    emit,
    view,
}) => {
    if (owner_id !== user_id) {
        forbidden();
    }
    const account_id = await (await view("next_account_id")).read();
    output(account_id);
    emit("account_registered", { account_id, owner_id });
};

export const register_account = defineAction({
    input: inputType,
    exec,
    dependencies: ["next_account_id"],
    output: positiveIntegerType,
});