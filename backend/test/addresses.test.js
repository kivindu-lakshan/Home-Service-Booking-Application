const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { once } = require("node:events");
const { before, beforeEach, after, test } = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const { User } = require("../src/models");
const routes = require("../src/routes/address/address.routes");

// Exercise real routing, validators, JWT middleware and controllers. Only MongoDB
// is substituted; the substitute enforces the version condition on each write.
const originals = { findById: User.findById, findOne: User.findOne, findOneAndUpdate: User.findOneAndUpdate };
const oldSecret = process.env.JWT_SECRET;
const secret = randomBytes(32).toString("hex");
const owner = "507f1f77bcf86cd799439011";
const other = "507f1f77bcf86cd799439012";
const addressId = "607f1f77bcf86cd799439011";
const secondId = "607f1f77bcf86cd799439012";
const foreignId = "607f1f77bcf86cd799439013";
const remoteId = "607f1f77bcf86cd799439014";
const valid = { label: "Home", line1: "24 Lake Road", areaCity: "Malabe", landmark: "Near the park", isDefault: false };
const copy = (value) => JSON.parse(JSON.stringify(value));
let users, writes, forceConflict, alwaysConflict, databaseFailure, server, base;

before(async () => {
  process.env.JWT_SECRET = secret;
  User.findById = async (id) => users[id] ? copy(users[id]) : null;
  User.findOne = (filter) => ({ select: () => ({ lean: async () => {
    if (databaseFailure) throw new Error("private database details");
    const user = users[filter._id];
    const snapshot = user && user.status === filter.status ? copy(user) : null;
    // Allow other requests to read the same revision before either one writes.
    await new Promise((resolve) => setImmediate(resolve));
    return snapshot;
  } }) });
  User.findOneAndUpdate = (filter, update, options) => ({ select: async () => {
    writes.push({ filter: copy(filter), update: copy(update), options });
    const user = users[filter._id];
    if (forceConflict) {
      forceConflict = false;
      user.addresses.push({ ...valid, _id: remoteId, label: "Added concurrently" });
      user.__v += 1;
      return null;
    }
    const matchesVersion = typeof filter.__v === "object" ? user?.__v === undefined : user?.__v === filter.__v;
    if (alwaysConflict || !user || user.status !== filter.status || !matchesVersion) return null;
    assert.deepEqual(Object.keys(update.$set), ["addresses"]);
    assert.deepEqual(update.$inc, { __v: 1 });
    assert.equal(options.runValidators, true);
    user.addresses = copy(update.$set.addresses);
    user.__v = (user.__v || 0) + 1;
    return copy(user);
  } });
  const app = express();
  app.use(express.json());
  app.use("/api/addresses", routes);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}/api/addresses`;
});
beforeEach(() => {
  users = {
    [owner]: { _id: owner, status: "active", __v: 0, fullName: "Owner", email: "owner@example.invalid", passwordHash: "private", settings: { theme: "light" }, addresses: [] },
    [other]: { _id: other, status: "active", __v: 0, fullName: "Other", addresses: [{ ...valid, _id: foreignId, label: "Private place", isDefault: true }] },
  };
  writes = []; forceConflict = false; alwaysConflict = false; databaseFailure = false;
});
after(async () => {
  Object.assign(User, originals);
  if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret;
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});
const token = (id = owner, options = {}) => jwt.sign({ id }, secret, { expiresIn: "5m", ...options });
async function request(method, path = "", payload, access = token()) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(access ? { Authorization: `Bearer ${access}` } : {}), ...(payload !== undefined ? { "Content-Type": "application/json" } : {}) },
    ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
  });
  return { status: response.status, body: await response.json(), headers: response.headers };
}
function seedOwn() {
  users[owner].addresses = [
    { ...valid, _id: addressId, isDefault: true, latitude: 6.9, longitude: 79.9 },
    { ...valid, _id: secondId, label: "Work", isDefault: false },
  ];
}

test("create valid address trims values, assigns ID/timestamps, and defaults the first place", async () => {
  const otherBefore = copy(users[other]);
  const { status, body, headers } = await request("POST", "", { ...valid, label: " Home ", line1: " 24 Lake Road ", areaCity: " Malabe ", landmark: " Near the park " });
  assert.equal(status, 201);
  assert.match(body.data._id, /^[a-f0-9]{24}$/);
  assert.equal(body.data.label, "Home");
  assert.equal(body.data.line1, valid.line1);
  assert.equal(body.data.areaCity, valid.areaCity);
  assert.equal(body.data.landmark, valid.landmark);
  assert.equal(body.data.isDefault, true);
  assert.ok(body.data.createdAt && body.data.updatedAt);
  assert.equal(headers.get("cache-control"), "no-store");
  assert.deepEqual(users[other], otherBefore);
  assert.equal(users[owner].fullName, "Owner");
  assert.equal(users[owner].passwordHash, "private");
  assert.deepEqual(users[owner].settings, { theme: "light" });
});
test("read returns only current user's safe addresses, even with another user in query", async () => {
  seedOwn();
  const { status, body } = await request("GET", `?userId=${other}`);
  assert.equal(status, 200);
  assert.deepEqual(body.data.map((item) => item._id), [addressId, secondId]);
  assert.deepEqual(Object.keys(body.data[0]).sort(), ["_id", "label", "line1", "areaCity", "landmark", "isDefault", "createdAt", "updatedAt"].sort());
  assert.equal((await request("GET", `/${addressId}`)).body.data.line1, valid.line1);
  assert.equal(writes.length, 0);
});
test("read of an empty account returns an empty list", async () => {
  assert.deepEqual((await request("GET")).body.data, []);
});
test("update changes selected fields, preserves ID/coordinates and supports legacy timestamps", async () => {
  seedOwn();
  const result = await request("PATCH", `/${addressId}`, { label: " Main home ", landmark: " " });
  assert.equal(result.status, 200);
  assert.equal(result.body.data._id, addressId);
  assert.equal(result.body.data.label, "Main home");
  assert.equal(result.body.data.line1, valid.line1);
  assert.equal(result.body.data.landmark, "");
  assert.equal(result.body.data.createdAt, null);
  assert.ok(result.body.data.updatedAt);
  assert.equal(users[owner].addresses[0].latitude, 6.9);
  assert.equal(users[owner].addresses[0].longitude, 79.9);
});
test("delete removes an address and promotes a remaining default", async () => {
  seedOwn();
  const result = await request("DELETE", `/${addressId}`);
  assert.equal(result.status, 200);
  assert.equal(result.body.data, null);
  assert.deepEqual(users[owner].addresses.map((item) => item._id), [secondId]);
  assert.equal(users[owner].addresses[0].isDefault, true);
  assert.equal((await request("GET", `/${addressId}`)).status, 404);
  assert.equal((await request("DELETE", `/${secondId}`)).status, 200);
  assert.deepEqual((await request("GET")).body.data, []);
});
test("changing default leaves exactly one default; deleting nondefault preserves it", async () => {
  seedOwn();
  assert.equal((await request("PATCH", `/${secondId}`, { isDefault: true })).status, 200);
  assert.deepEqual(users[owner].addresses.filter((item) => item.isDefault).map((item) => item._id), [secondId]);
  assert.equal((await request("GET")).body.data[0]._id, secondId);
  assert.equal((await request("DELETE", `/${addressId}`)).status, 200);
  assert.equal(users[owner].addresses[0].isDefault, true);
  assert.equal((await request("PATCH", `/${secondId}`, { isDefault: false })).body.data.isDefault, true);
});
test("creating a new default clears the previous default", async () => {
  seedOwn();
  const result = await request("POST", "", { ...valid, label: "New default", isDefault: true });
  assert.equal(result.status, 201);
  assert.deepEqual(users[owner].addresses.filter((item) => item.isDefault).map((item) => item._id), [result.body.data._id]);
});
test("optional landmark and default preference may be omitted", async () => {
  const result = await request("POST", "", { label: "Home", line1: "24 Lake Road", areaCity: "Malabe" });
  assert.equal(result.status, 201);
  assert.equal(result.body.data.landmark, "");
});
for (const method of ["GET", "PATCH", "DELETE"]) {
  test(`${method} cannot access someone else's or an unknown address`, async () => {
    seedOwn();
    const before = copy(users);
    for (const id of [foreignId, "707f1f77bcf86cd799439099"]) {
      const result = await request(method, `/${id}`, method === "PATCH" ? { label: "Attack" } : undefined);
      assert.equal(result.status, 404);
      assert.equal(result.body.message, "Address not found.");
    }
    assert.deepEqual(users, before);
    assert.equal(writes.length, 0);
  });
  test(`${method} rejects malformed address IDs`, async () => {
    assert.equal((await request(method, "/invalid", method === "PATCH" ? { label: "Home" } : undefined)).status, 400);
    assert.equal(writes.length, 0);
  });
}
for (const [key, max] of [["label", 40], ["line1", 200], ["areaCity", 100]]) {
  for (const value of ["", "   ", null, 12, {}, [], "X".repeat(max + 1), "A\u0000B"]) {
    test(`reject invalid ${key}: ${JSON.stringify(value).slice(0, 25)}`, async () => {
      seedOwn();
      for (const method of ["POST", "PATCH"]) {
        const result = await request(method, method === "PATCH" ? `/${addressId}` : "", { ...valid, [key]: value });
        assert.equal(result.status, 400);
        assert.ok(result.body.data.some((error) => error.path === key));
        assert.ok(result.body.data.every((error) => !Object.hasOwn(error, "value")));
      }
      assert.equal(writes.length, 0);
    });
  }
  test(`reject missing required ${key} on create`, async () => {
    const payload = { ...valid }; delete payload[key];
    assert.equal((await request("POST", "", payload)).status, 400);
    assert.equal(writes.length, 0);
  });
  test(`accept maximum length ${key}`, async () => {
    assert.equal((await request("POST", "", { ...valid, [key]: "X".repeat(max) })).status, 201);
  });
}
for (const [key, value] of [["landmark", null], ["landmark", "X".repeat(201)], ["landmark", {}], ["landmark", "A\nB"], ["isDefault", "true"], ["isDefault", 1], ["isDefault", null]]) {
  test(`reject invalid ${key}: ${JSON.stringify(value).slice(0, 25)}`, async () => {
    assert.equal((await request("POST", "", { ...valid, [key]: value })).status, 400);
    assert.equal(writes.length, 0);
  });
}
for (const key of ["userId", "user", "_id", "id", "role", "password", "token", "createdAt", "updatedAt", "latitude", "$set", "__proto__"]) {
  test(`reject protected field ${key}`, async () => {
    seedOwn();
    for (const method of ["POST", "PATCH"]) {
      const result = await request(method, method === "PATCH" ? `/${addressId}` : "", { ...valid, [key]: "sensitive-value" });
      assert.equal(result.status, 400);
      assert.equal(JSON.stringify(result.body).includes("sensitive-value"), false);
    }
    assert.equal(writes.length, 0);
  });
}
test("reject empty and array mutation bodies", async () => {
  for (const payload of [{}, []]) {
    assert.equal((await request("POST", "", payload)).status, 400);
    assert.equal((await request("PATCH", `/${addressId}`, payload)).status, 400);
  }
  assert.equal(writes.length, 0);
});
for (const access of [null, "bad-token", () => token(owner, { expiresIn: -1 }), () => jwt.sign({ id: owner }, "wrong-test-secret")]) {
  test("unauthorized requests cannot read or mutate addresses", async () => {
    const authToken = typeof access === "function" ? access() : access;
    for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
      const result = await request(method, method === "PATCH" || method === "DELETE" ? `/${addressId}` : "", method === "POST" || method === "PATCH" ? valid : undefined, authToken);
      assert.equal(result.status, 401);
    }
    assert.equal(writes.length, 0);
  });
}
for (const status of ["suspended", "deleted"]) {
  test(`${status} users cannot manage addresses`, async () => {
    users[owner].status = status;
    assert.equal((await request("POST", "", valid)).status, 401);
    assert.equal(writes.length, 0);
  });
}
test("concurrent default creates retain all addresses and exactly one default", async () => {
  const results = await Promise.all(["Home", "Work", "Parents"].map((label) => request("POST", "", { ...valid, label, isDefault: true })));
  assert.ok(results.every((result) => result.status === 201));
  assert.equal(users[owner].addresses.length, 3);
  assert.equal(users[owner].addresses.filter((item) => item.isDefault).length, 1);
  assert.equal(new Set(users[owner].addresses.map((item) => item._id)).size, 3);
});
test("retry preserves a concurrently added address", async () => {
  forceConflict = true;
  const result = await request("POST", "", valid);
  assert.equal(result.status, 201);
  assert.equal(users[owner].addresses.length, 2);
  assert.ok(users[owner].addresses.some((item) => item._id === remoteId));
  assert.equal(writes.length, 2);
});
test("persistent write conflicts produce 409 after bounded retries", async () => {
  alwaysConflict = true;
  assert.equal((await request("POST", "", valid)).status, 409);
  assert.equal(writes.length, 5);
  assert.deepEqual(users[owner].addresses, []);
});
test("legacy users without a version key can add an address", async () => {
  delete users[owner].__v;
  assert.equal((await request("POST", "", valid)).status, 201);
  assert.equal(users[owner].__v, 1);
});
test("database errors do not expose internal details or report success", async () => {
  databaseFailure = true;
  const result = await request("POST", "", valid);
  assert.equal(result.status, 500);
  assert.equal(result.body.success, false);
  assert.equal(JSON.stringify(result.body).includes("private database details"), false);
});
test("existing Mongoose User schema retains new address fields without a new model", () => {
  const date = new Date();
  const user = new User({ fullName: "Test User", email: "test@example.invalid", passwordHash: "test-hash", addresses: [{ ...valid, createdAt: date, updatedAt: date }] });
  assert.equal(user.validateSync(), undefined);
  assert.equal(user.addresses[0].landmark, valid.landmark);
  assert.equal(user.addresses[0].createdAt.getTime(), date.getTime());
  assert.ok(user.addresses[0]._id);
});
