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

    it("rejects invalid action input", async () => {
        const store = await createAccountStore();
        const result = await store.do("register_account", {} as RegisterAccount);
        expect(result.status).toBe("rejected");
        expect(result.message).toBe("Invalid action input: Missing required property: owner_id");
    });

    it("can register account", async () => {
        const store = await createAccountStore();
        const result = await store.do("register_account", { owner_id: "jane_doe" });
        expect(result.status).toBe("success");
        expect(result.output).toBe(1);
    });

    it("can read initial state", async () => {
        const store = await createAccountStore();
        const view = await store.view("next_account_id");
        expect(view).toBeDefined();
        const state = await view?.read();
        expect(state).toBe(1);
    });

    it("can read state after commit", async () => {
        const store = await createAccountStore();
        const result = await store.do("register_account", { owner_id: "jane_doe" });
        const view = await store.view("next_account_id", { sync: result.committed });
        expect(view).toBeDefined();
        const state = await view?.read();
        expect(state).toBe(2);
    });

    it("can register two accounts", async () => {
        const store = await createAccountStore();
        await store.do("register_account", { owner_id: "jane_doe" });
        const result = await store.do("register_account", { owner_id: "jane_doe" });
        expect(result.output).toBe(2);
    });
});
