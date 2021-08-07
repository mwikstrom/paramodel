import { RegisterAccount } from "./account-domain/register-account";
import { AccountActions } from "./account-domain/write-model";
import { createAccountStore } from "./create-account-store";

describe("DomainStore.do", () => {
    it("rejects unknown action", async () => {
        const store = await createAccountStore();
        const result = await store.do("incorrect" as keyof AccountActions, {} as RegisterAccount);
        expect(result.status).toBe("rejected");
        expect(result.message).toBe("Unknown action: incorrect");
    });

    it("rejects invalid action input", async () => {
        const store = await createAccountStore();
        const result = await store.do("register_account", {} as RegisterAccount);
        expect(result.status).toBe("rejected");
        expect(result.message).toBe("Invalid action input: Missing required property: owner_id");
    });

    it("valid action is accepted", async () => {
        const store = await createAccountStore();
        const result = await store.do("register_account", { owner_id: "jane_doe" });
        expect(result.status).toBe("success");
        expect(result.output).toBe(1);
    });

    it("action can be forbidden", async () => {
        const store = await createAccountStore();
        const result = await store.do("register_account", { owner_id: "other" });
        expect(result.status).toBe("forbidden");
    });
});
