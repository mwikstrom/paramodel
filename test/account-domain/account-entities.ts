import { numberType, recordType, stringType, Type } from "paratype";
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
    owner_id: string;
    balance: number;
};

const accountPropsType: Type<AccountProps> = recordType({
    owner_id: stringType,
    balance: numberType,
});

const account_registered: EntityProjectionFunc<Change<AccountRegistered>, AccountProps> = async (
    { arg: { account_id, owner_id } },
    { get, put },
) => {
    const found = await get(account_id);
    if (!found) {
        put(account_id, { owner_id, balance: 0 });
    }
};

const account_deleted: EntityProjectionFunc<Change<AccountDeleted>, AccountProps> = async (
    { arg: { account_id } },
    { del },
) => del(account_id);

const money_deposited: EntityProjectionFunc<Change<MoneyDeposited>, AccountProps> = async (
    { arg: { account_id, amount } },
    { get, put },
) => {
    const found = await get(account_id);
    if (found) {
        put(account_id, { ...found, balance: found.balance + amount});
    }
};

const money_withdrawn: EntityProjectionFunc<Change<MoneyWithdrawn>, AccountProps> = async (
    { arg: { account_id, amount } },
    { get, put },
) => {
    const found = await get(account_id);
    if (found) {
        put(account_id, { ...found, balance: found.balance - amount});
    }
};

const money_transferred: EntityProjectionFunc<Change<MoneyTransferred>, AccountProps> = async (
    { arg: { from_account_id, to_account_id, amount } },
    { get, put },
) => {
    const from = await get(from_account_id);    
    const to = await get(to_account_id);    
    if (from && to) {
        put(from_account_id, { ...from, balance: from.balance - amount});
        put(to_account_id, { ...to, balance: to.balance + amount});
    }
};

const on: EntityChangeHandlers<AccountChanges, AccountProps> = {
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
    on,
    auth,
);
