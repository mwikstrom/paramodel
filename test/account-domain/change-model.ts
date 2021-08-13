import { numberType, positiveIntegerType, recordType, stringType } from "paratype";
import { PiiString, piiStringType } from "../../src";

export type AccountRegistered = {
    account_id: number;
    owner_id: string;
    account_name: PiiString;
}

export type AccountDeleted = {
    account_id: number;
}

export type MoneyWithdrawn = {
    account_id: number;
    amount: number;
}

export type MoneyDeposited = {
    account_id: number;
    amount: number;
}

export type MoneyTransferred = {
    from_account_id: number;
    to_account_id: number;
    amount: number;
}

const account_registered = recordType<AccountRegistered>({
    account_id: positiveIntegerType,
    owner_id: stringType,
    account_name: piiStringType,
});

const account_deleted = recordType<AccountDeleted>({
    account_id: positiveIntegerType,
});

const money_deposited = recordType<MoneyDeposited>({
    account_id: positiveIntegerType,
    amount: numberType,
});

const money_withdrawn = recordType<MoneyDeposited>({
    account_id: positiveIntegerType,
    amount: numberType,
});

const money_transferred = recordType<MoneyTransferred>({
    from_account_id: positiveIntegerType,
    to_account_id: positiveIntegerType,
    amount: numberType,
});

export const accountChanges = {
    account_registered,
    account_deleted,
    money_withdrawn,
    money_deposited,
    money_transferred,
};

export type AccountChanges = typeof accountChanges;
