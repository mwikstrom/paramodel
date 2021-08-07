import { RegisterAccount } from "./account-domain/register-account";
import { AccountActions } from "./account-domain/write-model";
import { createAccountStore } from "./create-account-store";

describe("DomainStore", () => {
    it("rejects unknown action", async () => {
        const store = await createAccountStore();
        const result = await store.do("incorrect" as keyof AccountActions, {} as RegisterAccount);
        expect(result.status).toBe("rejected");
        expect(result.message).toBe("Unknown action: incorrect");
    });
});
