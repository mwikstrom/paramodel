import { createAccountStore } from "./create-account-store";

describe("DomainStore", () => {
    it("rejects unknown action", async () => {
        const store = await createAccountStore();
        const result = await store.do("incorrect" as any, null as any);
        expect(result.status).toBe("rejected");
        expect(result.message).toBe("???");
    });
});
