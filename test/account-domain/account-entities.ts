import { numberType, positiveIntegerType, recordType, stringType, Type } from "paratype";
import { Change, defineEntity, EntityAuthFunc, EntityChangeHandlers, EntityProjectionFunc } from "../../src";
import { AccessScope } from "./access-scope";
import { 
    AccountChanges, 
    AccountDeleted, 
    AccountRegistered, 
    MoneyDeposited, 
    MoneyTransferred, 
    MoneyWithdrawn 
} from "./change-model";

type AccountProps = {
    account_id: number;
    owner_id: string;
    balance: number;
};

const accountPropsType: Type<AccountProps> = recordType({
    account_id: positiveIntegerType,
    owner_id: stringType,
    balance: numberType,
});

const account_registered: EntityProjectionFunc<AccountProps, "account_id", Change<AccountRegistered>> = async (
    { arg: { account_id, owner_id } },
    { get, put },
) => {
    const found = await get({ account_id });
    if (!found) {
        put({ account_id, owner_id, balance: 0 });
    }
};

const account_deleted: EntityProjectionFunc<AccountProps, "account_id", Change<AccountDeleted>> = async (
    { arg: { account_id } },
    { del },
) => del({ account_id });

const money_deposited: EntityProjectionFunc<AccountProps, "account_id", Change<MoneyDeposited>> = async (
    { arg: { account_id, amount } },
    { get, put },
) => {
    const found = await get({ account_id });
    if (found) {
        put({ ...found, balance: found.balance + amount});
    }
};

const money_withdrawn: EntityProjectionFunc<AccountProps, "account_id", Change<MoneyWithdrawn>> = async (
    { arg: { account_id, amount } },
    { get, put },
) => {
    const found = await get({ account_id });
    if (found) {
        put({ ...found, balance: found.balance - amount});
    }
};

const money_transferred: EntityProjectionFunc<AccountProps, "account_id", Change<MoneyTransferred>> = async (
    { arg: { from_account_id, to_account_id, amount } },
    { get, put },
) => {
    const from = await get({ account_id: from_account_id });    
    const to = await get({ account_id: to_account_id });    
    if (from && to) {
        put({ ...from, balance: from.balance - amount});
        put({ ...to, balance: to.balance + amount});
    }
};

const on: EntityChangeHandlers<AccountChanges, AccountProps, "account_id"> = {
    account_registered,
    account_deleted,
    money_deposited,
    money_transferred,
    money_withdrawn,
};

const auth: EntityAuthFunc<AccessScope, AccountProps> = async (
    { where }, 
    { user_id },
) => where("owner_id", "==", user_id);

export const accounts = defineEntity(
    accountPropsType,
    "account_id",
    on,
    auth,
);
