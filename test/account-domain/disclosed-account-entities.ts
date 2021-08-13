import { numberType, positiveIntegerType, recordType, stringType, Type } from "paratype";
import { defineEntityMapping, Disclosed } from "../../src";
import { accountAuth, AccountProps } from "./account-entities";

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

export const disclosed_accounts = defineEntityMapping({
    type: disclosedAccountPropsType,
    key: "account_id",
    map,
    source: "accounts",
    auth: accountAuth,
});
