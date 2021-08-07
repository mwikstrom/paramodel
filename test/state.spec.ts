import { createAccountStore } from "./create-account-store";

describe("DomainStore.view-state", () => {
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

    it("can read state before and after sync", async () => {
        const store = await createAccountStore();
        await store.do("register_account", { owner_id: "jane_doe" });
        const before = await store.view("next_account_id");
        await store.sync();
        const after = await store.view("next_account_id");
        expect(await before?.read()).toBe(1);
        expect(await after?.read()).toBe(2);
    });

    it("action see latest state", async () => {
        const store = await createAccountStore();
        await store.do("register_account", { owner_id: "jane_doe" });
        const result = await store.do("register_account", { owner_id: "jane_doe" });
        expect(result.output).toBe(2);
    });
});
