import { numberType, positiveIntegerType, recordType, stringType, Type } from "paratype";
import { defineEntityMapping, Disclosed, EntityAuthFunc } from "../../src";
import { AccessScope } from "./access-scope";
import { AccountProps } from "./account-entities";

type DisclosedAccountProps = Disclosed<AccountProps>;

const disclosedAccountPropsType: Type<DisclosedAccountProps> = recordType({
    account_id: positiveIntegerType,
    owner_id: stringType,
    account_name: stringType,
    balance: numberType,
});

const map = (
    source: AccountProps,
    disclose: <T>(value: T) => Promise<Disclosed<T>>
): Promise<DisclosedAccountProps> => disclose(source);

const auth: EntityAuthFunc<AccessScope, DisclosedAccountProps> = async (
    { where }, 
    { user_id },
) => where("owner_id", "==", user_id);

export const disclosed_accounts = defineEntityMapping({
    type: disclosedAccountPropsType,
    key: "account_id",
    map,
    source: "accounts",
    auth,
});
