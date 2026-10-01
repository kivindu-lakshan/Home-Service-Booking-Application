const assert = require("node:assert/strict");
const { test } = require("node:test");
const { supportCategories, validateSupport, cleanSupport, emptySupport } = require("../src/validation/support.ts");
const valid = { category: "Booking issue", subject: "Wrong booking time", description: "Please check my appointment time." };
for (const category of supportCategories) test(`accept category ${category}`, () => assert.deepEqual(validateSupport({ ...valid, category }), {}));
test("empty form requires all fields", () => assert.equal(Object.keys(validateSupport(emptySupport())).length, 3));
test("invalid category rejected", () => assert.ok(validateSupport({ ...valid, category: "Other category" }).category));
for (const [key, min, max] of [["subject", 3, 120], ["description", 10, 2000]]) test(`${key} validates whitespace, boundaries and control characters`, () => {
  for (const value of ["   ", "x".repeat(min - 1), "x".repeat(max + 1), "invalid\u0000characters"]) assert.ok(validateSupport({ ...valid, [key]: value })[key]);
  for (const value of ["x".repeat(min), "x".repeat(max)]) assert.equal(validateSupport({ ...valid, [key]: value })[key], undefined);
});
test("trim values and strip protected fields", () => assert.deepEqual(cleanSupport({ ...valid, subject: `  ${valid.subject}  `, userId: "other", status: "resolved" }), valid));
test("multiline description accepted", () => assert.deepEqual(validateSupport({ ...valid, description: "First line\nSecond line" }), {}));
