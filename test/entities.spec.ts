import { createAccountStore } from "./create-account-store";

describe("DomainStore.view-entities", () => {
    it("can read initial entities", async () => {
        const store = await createAccountStore();
        const view = await store.view("accounts");
        expect(await view?.count()).toBe(0);
    });

    it("can read entity after commit", async () => {
        const store = await createAccountStore();
        const result = await store.do("register_account", { owner_id: "jane_doe" });
        const view = await store.view("accounts", { sync: result.committed });
        expect(await view?.count()).toBe(1);
    });

    it("can read entity before and after sync", async () => {
        const store = await createAccountStore();
        await store.do("register_account", { owner_id: "jane_doe" });
        const before = await store.view("accounts");
        await store.sync();
        const after = await store.view("accounts");
        expect(before?.version).toBe(0);
        expect(await before?.count()).toBe(0);
        expect(after?.version).toBe(1);
        expect(await after?.count()).toBe(1);
    });
});
