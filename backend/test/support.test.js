const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { once } = require("node:events");
const { before, beforeEach, after, test } = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const { User, SupportTicket } = require("../src/models");
const routes = require("../src/routes/support/support.routes");
const owner = "507f1f77bcf86cd799439011", other = "507f1f77bcf86cd799439012", id = "607f1f77bcf86cd799439011";
const valid = { category: "Booking issue", subject: "Booking time is incorrect", description: "Please help me check the appointment time." };
const secret = randomBytes(32).toString("hex"), oldSecret = process.env.JWT_SECRET;
const originals = { find: SupportTicket.find, findOne: SupportTicket.findOne, create: SupportTicket.create, findOneAndUpdate: SupportTicket.findOneAndUpdate };
const originalUser = User.findById;
let rows, server, base, role, failed, changeStatus;
const matches = (row, query) => Object.entries(query).every(([key, value]) => String(row[key]) === String(value));
before(async () => {
  process.env.JWT_SECRET = secret;
  User.findById = async (userId) => ({ _id: userId, status: "active", role });
  SupportTicket.find = (query) => ({ sort: async () => { if (failed) throw new Error("private db error"); return rows.filter((row) => matches(row, query)); } });
  SupportTicket.findOne = async (query) => rows.find((row) => matches(row, query));
  SupportTicket.create = async (payload) => {
    const document = new SupportTicket(payload); await document.validate();
    const row = { ...document.toObject(), createdAt: new Date(), updatedAt: new Date() }; rows.push(row); return row;
  };
  SupportTicket.findOneAndUpdate = async (query, update, options) => {
    assert.equal(options.runValidators, true); assert.equal(options.new, true);
    if (changeStatus) rows[0].status = "resolved";
    const row = rows.find((item) => matches(item, query));
    if (!row) return null;
    Object.assign(row, update.$set, { updatedAt: new Date() }); return row;
  };
  const app = express(); app.use(express.json()); app.use("/api/support", routes);
  server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}/api/support/tickets`;
});
beforeEach(() => { rows = []; role = "customer"; failed = false; changeStatus = false; });
after(async () => {
  Object.assign(SupportTicket, originals); User.findById = originalUser;
  if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret;
  await new Promise((resolve) => server.close(resolve));
});
const seed = (status = "pending", user = owner) => rows.push({ ...valid, _id: id, user, status, createdAt: new Date(), updatedAt: new Date(), privateField: "secret" });
async function request(method, path = "", payload, user = owner) {
  const response = await fetch(base + path, { method, headers: { ...(user ? { Authorization: `Bearer ${jwt.sign({ id: user }, secret, { expiresIn: "5m" })}` } : {}), "Content-Type": "application/json" }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) });
  return { status: response.status, body: await response.json() };
}
test("create assigns authenticated owner and pending status, trims and returns safe data", async () => {
  const result = await request("POST", "", { ...valid, subject: "  Booking time is incorrect  " });
  assert.equal(result.status, 201); assert.equal(String(rows[0].user), owner);
  assert.equal(result.body.data.status, "pending"); assert.equal(result.body.data.subject, valid.subject);
  assert.equal(result.body.data.user, undefined); assert.ok(result.body.data.createdAt);
});
test("list filters by current user despite query parameters", async () => {
  seed(); seed("pending", other);
  const result = await request("GET", `?userId=${other}`);
  assert.equal(result.status, 200); assert.equal(result.body.data.length, 1);
  assert.equal(result.body.data[0].privateField, undefined);
});
test("read owned ticket", async () => { seed(); const result = await request("GET", `/${id}`); assert.equal(result.status, 200); assert.equal(result.body.data.subject, valid.subject); });
test("update pending ticket supports partial update", async () => { seed(); const result = await request("PATCH", `/${id}`, { subject: " Updated subject " }); assert.equal(result.status, 200); assert.equal(result.body.data.subject, "Updated subject"); assert.equal(rows[0].description, valid.description); });
test("cancel preserves the record as cancelled", async () => { seed(); const result = await request("POST", `/${id}/cancel`, {}); assert.equal(result.status, 200); assert.equal(rows.length, 1); assert.equal(rows[0].status, "cancelled"); });
for (const status of ["resolved", "cancelled", "in_progress"]) for (const action of ["edit", "cancel"]) test(`${status} rejects ${action}`, async () => {
  seed(status); const result = await request(action === "edit" ? "PATCH" : "POST", `/${id}${action === "cancel" ? "/cancel" : ""}`, action === "edit" ? valid : {});
  assert.equal(result.status, 409); assert.equal(rows[0].status, status);
});
for (const method of ["GET", "PATCH", "POST"]) test(`other user cannot ${method} owned ticket`, async () => {
  seed("pending", other); const result = await request(method, `/${id}${method === "POST" ? "/cancel" : ""}`, method === "PATCH" ? valid : method === "POST" ? {} : undefined);
  assert.equal(result.status, 404); assert.equal(rows[0].status, "pending");
});
for (const payload of [{}, { ...valid, category: "Unknown" }, { ...valid, category: "" }, { ...valid, subject: "  " }, { ...valid, subject: "ab" }, { ...valid, subject: "x".repeat(121) }, { ...valid, description: "  " }, { ...valid, description: "short" }, { ...valid, description: "x".repeat(2001) }, { ...valid, subject: 12 }, { ...valid, description: null }, { ...valid, subject: "bad\u0000text" }, []]) test(`reject invalid payload ${JSON.stringify(payload).slice(0, 100)}`, async () => {
  assert.equal((await request("POST", "", payload)).status, 400); assert.equal(rows.length, 0);
});
for (const key of ["userId", "user", "_id", "status", "role", "password", "tokens", "createdAt"]) test(`reject protected ${key} on create and update`, async () => {
  assert.equal((await request("POST", "", { ...valid, [key]: "injected" })).status, 400);
  seed(); assert.equal((await request("PATCH", `/${id}`, { [key]: "injected" })).status, 400);
});
test("cancellation rejects supplied fields", async () => { seed(); assert.equal((await request("POST", `/${id}/cancel`, { userId: other })).status, 400); });
test("authentication required", async () => { assert.equal((await request("GET", "", undefined, null)).status, 401); });
for (const accountRole of ["admin", "provider"]) test(`reject ${accountRole} accounts`, async () => { role = accountRole; assert.equal((await request("GET")).status, 403); });
test("invalid ID returns 400", async () => { assert.equal((await request("GET", "/invalid")).status, 400); });
test("missing ticket returns 404", async () => { assert.equal((await request("GET", `/${id}`)).status, 404); });
test("concurrent resolution prevents edit", async () => { seed(); changeStatus = true; assert.equal((await request("PATCH", `/${id}`, { subject: "Changed subject" })).status, 409); assert.equal(rows[0].subject, valid.subject); });
test("database failures do not expose internal details", async () => { failed = true; const result = await request("GET"); assert.equal(result.status, 500); assert.ok(!JSON.stringify(result.body).includes("private db")); });
