const assert = require("node:assert/strict");
const { test } = require("node:test");
const { validateAddress, cleanAddress, emptyAddress, addressFields } = require("../src/validation/address.ts");
const valid = { label: "Home", line1: "24 Lake Road", areaCity: "Malabe", landmark: "", isDefault: true };
test("valid address and optional landmark pass", () => {
  assert.deepEqual(validateAddress(valid), {});
  assert.deepEqual(validateAddress({ ...valid, label: "නිවස", areaCity: "மாலபே", line1: "24/1, Lake Road" }), {});
});
test("all required fields report errors on empty form", () => {
  assert.deepEqual(Object.keys(validateAddress(emptyAddress())).sort(), ["label", "line1", "areaCity"].sort());
});
for (const { key, max, optional } of addressFields) {
  test(`${key} validates maximum length and control characters`, () => {
    assert.deepEqual(validateAddress({ ...valid, [key]: "A".repeat(max) }), {});
    assert.ok(validateAddress({ ...valid, [key]: "A".repeat(max + 1) })[key]);
    assert.ok(validateAddress({ ...valid, [key]: "A\u0000B" })[key]);
  });
  test(`${key} handles whitespace according to required/optional status`, () => {
    assert.equal(Boolean(validateAddress({ ...valid, [key]: "   " })[key]), !optional);
  });
}
test("sanitization trims values and excludes protected fields", () => {
  assert.deepEqual(cleanAddress({ ...valid, label: " Home ", line1: " 24 Lake Road ", areaCity: " Malabe ", landmark: "   ", userId: "other-user", _id: "injected" }), valid);
});
