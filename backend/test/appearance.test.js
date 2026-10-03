const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { once } = require("node:events");
const { before, beforeEach, after, test } = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const { User } = require("../src/models");
const routes = require("../src/routes/auth/auth.routes");
const owner = "507f1f77bcf86cd799439011", other = "507f1f77bcf86cd799439012";
const originals = { findById: User.findById, findOneAndUpdate: User.findOneAndUpdate };
const secret = randomBytes(32).toString("hex"), oldSecret = process.env.JWT_SECRET;
let users, server, base, failWrite;
const copy = (value) => JSON.parse(JSON.stringify(value));
before(async () => {
  process.env.JWT_SECRET = secret;
  User.findById = async (id) => users[id] ? copy(users[id]) : null;
  User.findOneAndUpdate = (query, update, options) => ({ select: async () => {
    if (failWrite) throw new Error("private database details");
    assert.equal(options.runValidators, true); assert.equal(options.new, true);
    assert.deepEqual(Object.keys(update.$set), ["settings.theme"]);
    const user = users[query._id]; if (!user || user.status !== query.status) return null;
    user.settings ||= {}; user.settings.theme = update.$set["settings.theme"]; return copy(user);
  } });
  const app = express(); app.use(express.json()); app.use("/api/auth", routes);
  server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}/api/auth/me/appearance`;
});
beforeEach(() => { failWrite = false; users = {
  [owner]: { _id: owner, status: "active", fullName: "Owner", addresses: [{ label: "Home" }], settings: { textSize: "large", notifications: { bookingReminders: false } } },
  [other]: { _id: other, status: "active", settings: { theme: "light" } },
}; });
after(async () => { Object.assign(User, originals); if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret; await new Promise((resolve) => server.close(resolve)); });
async function request(method, body, id = owner, suffix = "") {
  const response = await fetch(base + suffix, { method, headers: { "Content-Type": "application/json", ...(id ? { Authorization: `Bearer ${jwt.sign({ id }, secret)}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json() };
}
test("existing user defaults to light with safe output", async () => assert.deepEqual((await request("GET")).body.data, { theme: "light" }));
for (const theme of ["dark", "light"]) test(`persist ${theme} and preserve unrelated settings`, async () => {
  const before = copy(users); assert.equal((await request("PATCH", { theme })).status, 200);
  assert.deepEqual((await request("GET")).body.data, { theme });
  assert.deepEqual(users[owner].settings.notifications, before[owner].settings.notifications);
  assert.equal(users[owner].settings.textSize, "large"); assert.deepEqual(users[owner].addresses, before[owner].addresses); assert.deepEqual(users[other], before[other]);
});
for (const body of [{}, [], { theme: "system" }, { theme: null }, { theme: true }, { theme: {} }, { theme: "dark", userId: other }, { theme: "dark", role: "admin" }, { "settings.theme": "dark" }]) test(`reject invalid/protected input ${JSON.stringify(body)}`, async () => {
  const before = copy(users); assert.equal((await request("PATCH", body)).status, 400); assert.deepEqual(users, before);
});
test("cannot select another account using a query", async () => { await request("PATCH", { theme: "dark" }, owner, `?userId=${other}`); assert.equal(users[other].settings.theme, "light"); });
for (const method of ["GET", "PATCH"]) test(`${method} requires authentication`, async () => assert.equal((await request(method, method === "PATCH" ? { theme: "dark" } : undefined, null)).status, 401));
test("inactive account cannot save", async () => { users[owner].status = "suspended"; assert.equal((await request("PATCH", { theme: "dark" })).status, 401); });
test("database errors are safe", async () => { failWrite = true; const result = await request("PATCH", { theme: "dark" }); assert.equal(result.status, 500); assert.ok(!JSON.stringify(result.body).includes("private database")); });
