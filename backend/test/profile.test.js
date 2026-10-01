const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { once } = require("node:events");
const { before, after, test } = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const { User } = require("../src/models");
const authRoutes = require("../src/routes/auth/auth.routes");

// Exercise the real HTTP route and auth middleware without connecting to MongoDB.
const originalFindById = User.findById;
const originalSecret = process.env.JWT_SECRET;
const secret = randomBytes(32).toString("hex");
const userId = "507f1f77bcf86cd799439011";
const fixture = {
  _id: userId,
  fullName: "Profile Test User",
  email: "profile@example.invalid",
  phone: "test-phone",
  role: "customer",
  emailVerified: true,
  status: "active",
  avatarUrl: "https://example.invalid/avatar.png",
  passwordHash: "must-not-leave-the-server",
  token: "must-not-leave-the-server",
  addresses: [{ line1: "private address" }],
  settings: { theme: "dark" },
};
let server;
let baseUrl;

before(async () => {
  process.env.JWT_SECRET = secret;
  User.findById = async (id) => {
    if (id === userId) return fixture;
    if (id === "suspended" || id === "deleted") return { ...fixture, status: id };
    if (id === "no-photo") return { ...fixture, avatarUrl: undefined, emailVerified: false };
    return null;
  };
  const app = express();
  app.use("/api/auth", authRoutes);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}/api/auth/me`;
});

after(async () => {
  User.findById = originalFindById;
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function tokenFor(id, options = {}) {
  return jwt.sign({ id }, secret, { expiresIn: "5m", ...options });
}

async function request(token, query = "") {
  const response = await fetch(baseUrl + query, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { response, body: await response.json() };
}

test("current-user profile returns only allowlisted fields and ignores supplied user IDs", async () => {
  const { response, body } = await request(tokenFor(userId), "?id=someone-else&userId=someone-else");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(body, {
    success: true,
    data: {
      id: userId,
      fullName: fixture.fullName,
      email: fixture.email,
      phone: fixture.phone,
      role: "customer",
      emailVerified: true,
      status: "active",
      avatarUrl: fixture.avatarUrl,
    },
    message: "Success",
  });
});

test("missing photo and unverified email are represented honestly", async () => {
  const { response, body } = await request(tokenFor("no-photo"));
  assert.equal(response.status, 200);
  assert.equal(body.data.avatarUrl, null);
  assert.equal(body.data.emailVerified, false);
});

for (const [label, getToken] of [
  ["missing token", () => undefined],
  ["malformed token", () => "not-a-jwt"],
  ["invalid signature", () => jwt.sign({ id: userId }, "different-test-secret")],
  ["expired token", () => tokenFor(userId, { expiresIn: -1 })],
  ["missing user", () => tokenFor("missing")],
  ["suspended user", () => tokenFor("suspended")],
  ["deleted user", () => tokenFor("deleted")],
]) {
  test(`profile rejects ${label}`, async () => {
    const { response, body } = await request(getToken());
    assert.equal(response.status, 401);
    assert.equal(body.success, false);
    assert.equal(body.data, null);
  });
}
