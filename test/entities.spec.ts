import { positiveIntegerType } from "paratype";
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

    it("can update entity", async () => {
        const store = await createAccountStore();
        const a1 = await store.do("register_account", { owner_id: "jane_doe" });
        expect([a1.status, a1.message].filter(x => x).join(": ")).toBe("success");
        const { output: account_id } = a1;
        positiveIntegerType.assert(account_id);        
        const view1 = await store.view("accounts", { sync: 1 });        
        const a2 = await store.do("deposit_money", { account_id, amount: 100 });
        expect([a2.status, a2.message].filter(x => x).join(": ")).toBe("success");
        const view2 = await store.view("accounts", { sync: 2 });
        const a3 = await store.do("withdraw_money", { account_id, amount: 25 });
        expect([a3.status, a3.message].filter(x => x).join(": ")).toBe("success");
        const view3 = await store.view("accounts", { sync: 3 });
        expect(view1?.version).toBe(1);
        expect(view2?.version).toBe(2);
        expect(view3?.version).toBe(3);
        expect(await view1?.count()).toBe(1);
        expect(await view2?.count()).toBe(1);
        expect(await view3?.count()).toBe(1);
        const e1 = await view1?.get(1);
        const e2 = await view2?.get(1);
        const e3 = await view3?.get(1);
        expect(e1?.balance).toBe(0);
        expect(e2?.balance).toBe(100);
        expect(e3?.balance).toBe(75);
    });
});
