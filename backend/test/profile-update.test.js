const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { once } = require("node:events");
const { before, beforeEach, after, test } = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const { User } = require("../src/models");
const authRoutes = require("../src/routes/auth/auth.routes");

// Only the database boundary is stubbed. No live MongoDB data is read or changed.
const originalFindById = User.findById;
const originalUpdate = User.findOneAndUpdate;
const originalSecret = process.env.JWT_SECRET;
const secret = randomBytes(32).toString("hex");
const userId = "507f1f77bcf86cd799439011";
const otherId = "507f1f77bcf86cd799439012";
const initial = {
  _id: userId, fullName: "Profile Test User", email: "profile@example.invalid",
  phone: "+94 77 123 4567", role: "customer", emailVerified: true, status: "active",
  avatarUrl: "https://example.invalid/avatar.png", passwordHash: "private-hash",
  token: "private-token", addresses: [{ line1: "Private address" }],
  settings: { theme: "dark" }, twoStepEnabled: false,
};
let users;
let writes;
let updateFailure;
let inactiveDuringUpdate;
let server;
let baseUrl;

before(async () => {
  process.env.JWT_SECRET = secret;
  User.findById = async (id) => users[id] ? { ...users[id] } : null;
  User.findOneAndUpdate = async (filter, update, options) => {
    writes.push({ filter, update, options });
    if (updateFailure) throw new Error("private database connection details");
    if (inactiveDuringUpdate) return null;
    const current = users[filter._id];
    if (!current || current.status !== filter.status) return null;
    users[filter._id] = { ...current, ...update.$set };
    return { ...users[filter._id] };
  };
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}/api/auth/me`;
});

beforeEach(() => {
  users = {
    [userId]: structuredClone(initial),
    [otherId]: { ...structuredClone(initial), _id: otherId, fullName: "Other User" },
  };
  writes = [];
  updateFailure = false;
  inactiveDuringUpdate = false;
});

after(async () => {
  User.findById = originalFindById;
  User.findOneAndUpdate = originalUpdate;
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function tokenFor(id = userId, options = {}) {
  return jwt.sign({ id }, secret, { expiresIn: "5m", ...options });
}

async function patch(payload, token = tokenFor(), query = "") {
  const response = await fetch(baseUrl + query, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
  });
  return { response, body: await response.json() };
}

test("updates only the authenticated user, trims fields, persists and returns a safe profile", async () => {
  const otherBefore = structuredClone(users[otherId]);
  const { response, body } = await patch({ fullName: "  Updated Name  ", phone: "  077 987 6543  " }, tokenFor(), `?id=${otherId}&userId=${otherId}`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(writes, [{
    filter: { _id: userId, status: "active" },
    update: { $set: { fullName: "Updated Name", phone: "0779876543" } },
    options: { new: true, runValidators: true },
  }]);
  assert.deepEqual(body.data, {
    id: userId, fullName: "Updated Name", email: initial.email,
    phone: "0779876543", role: "customer", emailVerified: true,
    status: "active", avatarUrl: initial.avatarUrl,
  });
  assert.equal(body.message, "Profile updated successfully.");
  assert.deepEqual(users[otherId], otherBefore);
  for (const key of ["passwordHash", "token", "email", "role", "emailVerified", "avatarUrl", "addresses", "settings", "twoStepEnabled"]) {
    assert.deepEqual(users[userId][key], initial[key]);
  }
  const read = await fetch(baseUrl, { headers: { Authorization: `Bearer ${tokenFor()}` } });
  assert.deepEqual((await read.json()).data, body.data);
});

test("both fields are required, including for PATCH requests", async () => {
  for (const [payload, missingField] of [
    [{ fullName: "New Name" }, "phone"],
    [{ phone: "0771234567" }, "fullName"],
  ]) {
    const { response, body } = await patch(payload);
    assert.equal(response.status, 400);
    assert.ok(body.data.some((error) => error.path === missingField && error.msg.includes("required")));
    assert.equal(writes.length, 0);
    assert.deepEqual(users[userId], initial);
  }
});

test("accepts letters and spaces in international names and local mobile numbers", async () => {
  for (const fullName of ["අනුකා පෙරේරා", "அனுகா", "Élodie Martin", "李 明", "Al", "A".repeat(100)]) {
    assert.equal((await patch({ fullName, phone: "077 123 4567" })).response.status, 200);
    assert.equal(users[userId].phone, "0771234567");
  }
});

for (const field of ["email", "password", "passwordHash", "role", "token", "tokens", "_id", "id", "userId", "status", "emailVerified", "twoStepEnabled", "avatarUrl", "addresses", "settings", "$set", "__proto__"]) {
  test(`rejects protected/unknown field ${field} without any update or echo`, async () => {
    const { response, body } = await patch({ fullName: "Valid Name", phone: "0771234567", [field]: "sensitive-submitted-value" });
    assert.equal(response.status, 400);
    assert.equal(writes.length, 0);
    assert.equal(JSON.stringify(body).includes("sensitive-submitted-value"), false);
    assert.deepEqual(users[userId], initial);
  });
}

for (const [label, payload] of [
  ["empty body", {}], ["array body", []],
  ["blank name", { fullName: "   " }], ["short name", { fullName: "A" }],
  ["empty name", { fullName: "" }], ["name digits", { fullName: "Hasini123" }],
  ["name punctuation", { fullName: "Hasini@Perera" }],
  ["name apostrophe", { fullName: "O'Connor" }], ["name hyphen", { fullName: "Anne-Marie" }],
  ["name emoji", { fullName: "Hasini😀" }],
  ["long name", { fullName: "A".repeat(101) }],
  ["control characters", { fullName: "Name\nSurname" }],
  ["object name", { fullName: { $ne: null } }], ["null name", { fullName: null }],
  ["array name", { fullName: ["Valid Name"] }],
  ["short phone", { phone: "123" }], ["long phone", { phone: "1".repeat(16) }],
  ["empty phone", { phone: "" }], ["blank phone", { phone: "   " }],
  ["nine-digit phone", { phone: "077123456" }], ["eleven-digit phone", { phone: "07712345678" }],
  ["non-mobile prefix", { phone: "0111234567" }],
  ["international phone", { phone: "+94771234567" }],
  ["phone hyphens", { phone: "077-123-4567" }], ["phone brackets", { phone: "(077)1234567" }],
  ["phone letters", { phone: "077CALL1234" }], ["phone extension", { phone: "0771234567x1" }],
  ["misplaced plus", { phone: "077+1234567" }],
  ["numeric phone", { phone: 771234567 }], ["null phone", { phone: null }],
  ["object phone", { phone: { $set: "0771234567" } }],
]) {
  test(`rejects ${label} without writing`, async () => {
    const candidate = label === "empty body" || label === "array body"
      ? payload : { fullName: "Valid Name", phone: "0771234567", ...payload };
    const { response, body } = await patch(candidate);
    assert.equal(response.status, 400);
    assert.equal(writes.length, 0);
    assert.deepEqual(users[userId], initial);
    if (Array.isArray(body.data)) {
      for (const error of body.data) assert.equal(Object.hasOwn(error, "value"), false);
    }
  });
}

for (const [label, makeToken] of [
  ["missing token", () => null], ["malformed token", () => "not-a-token"],
  ["wrong signature", () => jwt.sign({ id: userId }, "different-test-secret")],
  ["expired token", () => tokenFor(userId, { expiresIn: -1 })],
  ["missing user", () => tokenFor("missing")],
]) {
  test(`rejects update with ${label}`, async () => {
    assert.equal((await patch({ fullName: "New Name", phone: "0771234567" }, makeToken())).response.status, 401);
    assert.equal(writes.length, 0);
  });
}

for (const status of ["suspended", "deleted"]) {
  test(`rejects a ${status} account`, async () => {
    users[userId].status = status;
    assert.equal((await patch({ fullName: "New Name", phone: "0771234567" })).response.status, 401);
    assert.equal(writes.length, 0);
  });
}

test("does not update an account that becomes inactive during the request", async () => {
  inactiveDuringUpdate = true;
  assert.equal((await patch({ fullName: "New Name", phone: "0771234567" })).response.status, 401);
  assert.deepEqual(users[userId], initial);
});

test("database failures return a safe error without claiming success", async () => {
  updateFailure = true;
  const { response, body } = await patch({ fullName: "New Name", phone: "0771234567" });
  assert.equal(response.status, 500);
  assert.equal(body.success, false);
  assert.equal(body.data, null);
  assert.equal(JSON.stringify(body).includes("private database"), false);
  assert.deepEqual(users[userId], initial);
});
