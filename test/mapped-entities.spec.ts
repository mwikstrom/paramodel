import { createAccountStore } from "./create-account-store";

describe("DomainStore.view-mapped-entities", () => {
    it("can read mapped entity after commit", async () => {
        const store = await createAccountStore();
        const result = await store.do("register_account", { owner_id: "jane_doe", account_name: "Jane's savings" });
        const view = await store.view("disclosed_accounts", { sync: result.committed });
        expect(await view?.count()).toBe(1);
        const account = await view?.get(1);
        expect(account?.owner_id).toBe("jane_doe");
        expect(account?.account_name).toBe("Jane's savings");
        expect(account?.balance).toBe(0);
        expect(account?.account_id).toBe(1);
    });
});
