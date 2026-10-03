const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { once } = require("node:events");
const { before, beforeEach, after, test } = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const { User } = require("../src/models");
const routes = require("../src/routes/auth/auth.routes");
const owner = "507f1f77bcf86cd799439011", other = "507f1f77bcf86cd799439012";
const defaults = { bookingConfirmations: true, arrivalStatusUpdates: true, bookingReminders: true };
const secret = randomBytes(32).toString("hex"), oldSecret = process.env.JWT_SECRET;
const originals = { findById: User.findById, findOneAndUpdate: User.findOneAndUpdate };
let users, server, base, failure, suspendedAfterAuth;
const copy = (value) => JSON.parse(JSON.stringify(value));
before(async () => {
  process.env.JWT_SECRET = secret;
  User.findById = async (id) => users[id] ? copy(users[id]) : null;
  User.findOneAndUpdate = (query, update, options) => ({ select: async (projection) => {
    if (failure) throw new Error("private database details");
    assert.equal(projection, "settings.notifications"); assert.equal(options.runValidators, true); assert.equal(options.new, true);
    const user = users[query._id];
    if (suspendedAfterAuth || !user || user.status !== query.status) return null;
    for (const [path, value] of Object.entries(update.$set)) {
      assert.ok(path.startsWith("settings.notifications."));
      user.settings ||= {}; user.settings.notifications ||= {};
      user.settings.notifications[path.split(".")[2]] = value;
    }
    return copy(user);
  } });
  const app = express(); app.use(express.json()); app.use("/api/auth", routes);
  server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}/api/auth/me/notification-preferences`;
});
beforeEach(() => {
  failure = false; suspendedAfterAuth = false;
  users = {
    [owner]: { _id: owner, status: "active", fullName: "Owner", passwordHash: "private", addresses: [{ label: "Home" }], settings: { theme: "dark", textSize: "large" } },
    [other]: { _id: other, status: "active", settings: { notifications: { ...defaults, bookingReminders: false } } },
  };
});
after(async () => { Object.assign(User, originals); if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret; await new Promise((resolve) => server.close(resolve)); });
async function request(method, payload, user = owner, suffix = "") {
  const result = await fetch(base + suffix, { method, headers: { "Content-Type": "application/json", ...(user ? { Authorization: `Bearer ${jwt.sign({ id: user }, secret, { expiresIn: "5m" })}` } : {}) }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) });
  return { status: result.status, body: await result.json(), headers: result.headers };
}
test("existing users get enabled defaults and safe response", async () => {
  const result = await request("GET"); assert.equal(result.status, 200); assert.deepEqual(result.body.data, defaults); assert.equal(result.headers.get("cache-control"), "no-store");
});
test("missing settings returns defaults", async () => { delete users[owner].settings; assert.deepEqual((await request("GET")).body.data, defaults); });
test("schema supplies defaults for newly constructed users", () => { const user = new User({}); assert.deepEqual(user.settings.notifications.toObject(), defaults); });
test("save and subsequent read persist exact booleans and preserve unrelated data", async () => {
  const before = copy(users); const preferences = { bookingConfirmations: false, arrivalStatusUpdates: true, bookingReminders: false };
  const result = await request("PATCH", preferences); assert.equal(result.status, 200); assert.deepEqual(result.body.data, preferences);
  assert.deepEqual((await request("GET")).body.data, preferences);
  assert.deepEqual(users[other], before[other]); assert.deepEqual(users[owner].addresses, before[owner].addresses);
  assert.equal(users[owner].settings.theme, "dark"); assert.equal(users[owner].settings.textSize, "large"); assert.equal(users[owner].passwordHash, "private"); assert.equal(users[owner].fullName, "Owner");
});
test("partial updates preserve other saved preferences", async () => {
  users[owner].settings.notifications = { ...defaults, arrivalStatusUpdates: false };
  const result = await request("PATCH", { bookingReminders: false });
  assert.deepEqual(result.body.data, { bookingConfirmations: true, arrivalStatusUpdates: false, bookingReminders: false });
});
test("query user ID cannot read or change another account", async () => {
  const before = copy(users[other]); assert.deepEqual((await request("GET", undefined, owner, `?userId=${other}`)).body.data, defaults);
  await request("PATCH", { bookingReminders: false }, owner, `?userId=${other}`); assert.deepEqual(users[other], before);
});
for (const field of Object.keys(defaults)) for (const value of ["false", 0, null, {}, []]) test(`reject nonboolean ${field}: ${JSON.stringify(value)}`, async () => {
  const before = copy(users); assert.equal((await request("PATCH", { [field]: value })).status, 400); assert.deepEqual(users, before);
});
for (const payload of [{}, [], { userId: other }, { _id: other }, { role: "admin" }, { password: "secret" }, { settings: {} }, { "settings.notifications.bookingReminders": false }]) test(`reject protected or invalid fields ${JSON.stringify(payload)}`, async () => {
  const before = copy(users); assert.equal((await request("PATCH", payload)).status, 400); assert.deepEqual(users, before);
});
for (const method of ["GET", "PATCH"]) test(`${method} requires authentication`, async () => assert.equal((await request(method, method === "PATCH" ? defaults : undefined, null)).status, 401));
test("inactive users rejected", async () => { users[owner].status = "suspended"; assert.equal((await request("GET")).status, 401); });
test("suspension after authentication prevents save", async () => { suspendedAfterAuth = true; assert.equal((await request("PATCH", defaults)).status, 401); });
test("database failures hide internal details", async () => { failure = true; const result = await request("PATCH", defaults); assert.equal(result.status, 500); assert.ok(!JSON.stringify(result.body).includes("private database")); });
