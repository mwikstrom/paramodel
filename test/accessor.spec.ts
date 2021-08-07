import { _compileAccessor } from "../src/internal/compile-accessor";

describe("compiled-accessor", () => {
    it("can access self", () => {
        const a = _compileAccessor([]);
        const src = {};
        const result = a(src);
        expect(result).toBe(src);
    });

    it("can access property", () => {
        const a = _compileAccessor(["foo"]);
        const src = { foo: "bar" };
        const result = a(src);
        expect(result).toBe("bar");
    });

    it("can access nested property", () => {
        const a = _compileAccessor(["foo", "bar"]);
        const src = { foo: { bar: "baz" } };
        const result = a(src);
        expect(result).toBe("baz");
    });

    it("returns void when property isn't defined", () => {
        const a = _compileAccessor(["foo", "bar"]);
        const src = { foo: { baz: "bar" } };
        const result = a(src);
        expect(result).toBeUndefined();
    });
});