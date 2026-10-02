const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const { once } = require('node:events');
const express = require('express');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('node:crypto');
const { User, AuthToken } = require('../src/models');
const { hashToken } = require('../src/utils/tokens');
const routes = require('../src/routes/auth/auth.routes');
const originals = { find: AuthToken.find, updateMany: AuthToken.updateMany, create: AuthToken.create,
  findOneAndUpdate: AuthToken.findOneAndUpdate, findById: User.findById, update: User.findByIdAndUpdate };
const secretBefore = process.env.JWT_SECRET;
const secret = randomBytes(32).toString('hex');
const users = { a: { _id: 'a', fullName: 'Demo', email: 'demo@example.invalid', role: 'customer', status: 'active', emailVerified: false },
  b: { _id: 'b', status: 'active', emailVerified: false } };
let records = [], server, base;
before(async () => {
  process.env.JWT_SECRET = secret;
  User.findById = async id => users[id];
  User.findByIdAndUpdate = async (id, changes) => Object.assign(users[id], changes);
  AuthToken.find = async q => records.filter(r => r.user === q.user && r.type === q.type);
  AuthToken.updateMany = async (q, update) => records.filter(r => r.user === q.user && r.type === q.type && !r.usedAt).forEach(r => Object.assign(r, update.$set));
  AuthToken.create = async r => { records.push(r); return r; };
  AuthToken.findOneAndUpdate = async (q, update) => {
    const r = records.find(r => r.user === q.user && r.type === q.type && r.tokenHash === q.tokenHash && !r.usedAt && r.expiresAt > q.expiresAt.$gt);
    if (r) Object.assign(r, update.$set);
    return r || null;
  };
  const app = express(); app.use(express.json()); app.use('/auth', routes);
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/auth`;
});
after(async () => {
  Object.assign(AuthToken, { find: originals.find, updateMany: originals.updateMany, create: originals.create, findOneAndUpdate: originals.findOneAndUpdate });
  User.findById = originals.findById; User.findByIdAndUpdate = originals.update;
  if (secretBefore === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = secretBefore;
  await new Promise(resolve => server.close(resolve));
});
async function request(path, body = {}, id = 'a') {
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(id ? { Authorization: `Bearer ${jwt.sign({ id }, secret)}` } : {}) }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
test('demo code lifecycle is hashed, scoped, expiring, invalidated on resend and single-use', async () => {
  const first = await request('/resend-verification');
  const oldCode = first.body.data.verificationCode;
  assert.match(oldCode, /^[0-9]{6}$/);
  assert.equal(records[0].tokenHash, hashToken(oldCode));
  assert.equal(JSON.stringify(records).includes(oldCode), false);
  assert.ok(records[0].expiresAt > new Date());
  const next = await request('/resend-verification'); const code = next.body.data.verificationCode;
  assert.notEqual(code, oldCode);
  assert.equal((await request('/verify-email', { code: oldCode })).status, 400);
  assert.equal((await request('/verify-email', { code }, 'b')).status, 400);
  assert.equal((await request('/verify-email', { code: '000000' })).status, 400);
  const verified = await request('/verify-email', { code });
  assert.equal(verified.status, 200); assert.equal(verified.body.data.emailVerified, true);
  assert.equal(verified.body.data.passwordHash, undefined); assert.equal(verified.body.data.token, undefined);
  assert.equal((await request('/verify-email', { code })).status, 400);
});
test('expired codes are rejected', async () => {
  users.a.emailVerified = false;
  const result = await request('/resend-verification'); records.at(-1).expiresAt = new Date(0);
  assert.equal((await request('/verify-email', { code: result.body.data.verificationCode })).status, 400);
});
test('invalid code formats and unauthenticated requests are rejected', async () => {
  for (const code of ['', '12345', '1234567', 'abcdef', 123456]) assert.equal((await request('/verify-email', { code })).status, 422);
  assert.equal((await request('/verify-email', { code: '123456' }, null)).status, 401);
  assert.equal((await request('/resend-verification', {}, null)).status, 401);
});

test('registration returns a six-digit demo code without verifying the new user', async () => {
  const exists = User.exists, create = User.create;
  try {
    User.exists = async () => false;
    User.create = async values => ({ ...values, _id: 'new-user', role: 'customer', status: 'active', emailVerified: false });
    const result = await request('/register', { fullName: 'Demo Student', email: 'new@example.invalid', phone: '0771234567', password: 'DemoPass123' }, null);
    assert.equal(result.status, 200);
    assert.match(result.body.data.verificationCode, /^[0-9]{6}$/);
    assert.equal(result.body.data.user.emailVerified, false);
    assert.equal(result.body.data.user.passwordHash, undefined);
    assert.equal(result.body.data.verificationToken, undefined);
    assert.equal(records.at(-1).tokenHash, hashToken(result.body.data.verificationCode));
  } finally { User.exists = exists; User.create = create; }
});
