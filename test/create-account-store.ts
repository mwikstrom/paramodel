import { createDomainProvider, createMemoryDriver, DomainStore } from "../src";
import { accountModel, AccountModel } from "./account-domain";
import { AccessScope } from "./account-domain/access-scope";

export const createAccountStore = async (
    accessScope: AccessScope = { user_id: "jane_doe" },
    storeId = "test"
): Promise<DomainStore<AccountModel>> => {
    const driver = createMemoryDriver();
    const provider = createDomainProvider(driver);
    return await provider.get(storeId, accountModel, accessScope);
};
