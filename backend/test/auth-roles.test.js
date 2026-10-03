const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const { once } = require('node:events');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, AuthToken } = require('../src/models');
const routes = require('../src/routes/auth/auth.routes');
const adminRoutes = require('../src/routes/admin/admin.routes');
const originals = { exists: User.exists, create: User.create, findOne: User.findOne, findById: User.findById, tokenCreate: AuthToken.create, secret: process.env.JWT_SECRET };
const users = new Map();
let server, base;
before(async () => {
  process.env.JWT_SECRET = 'isolated-auth-role-test-secret';
  User.exists = async ({ email }) => users.has(email);
  User.create = async (data) => {
    // Apply the actual Mongoose schema's validation to each captured write.
    const document = new User(data);
    await document.validate();
    const user = document.toObject();
    users.set(user.email, user);
    return user;
  };
  User.findOne = ({ email }) => ({ select: async () => users.get(email) });
  User.findById = async (id) => [...users.values()].find(user => String(user._id) === id);
  AuthToken.create = async () => ({});
  await User.create({ fullName: 'Existing Admin', email: 'admin@example.invalid', phone: '0771234567', role: 'admin', passwordHash: await bcrypt.hash('Example123', 4) });
  const app = express();
  app.use(express.json());
  app.use('/api/auth', routes);
  app.use('/api/admin', adminRoutes);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  User.exists = originals.exists; User.create = originals.create; User.findOne = originals.findOne; User.findById = originals.findById; AuthToken.create = originals.tokenCreate;
  if (originals.secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = originals.secret;
  await new Promise(resolve => server.close(resolve));
});
async function post(path, data) {
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return { status: response.status, body: await response.json() };
}
const draft = role => ({ fullName: 'Test Account', email: `${role}@example.invalid`, phone: '0771234567', password: 'Example123', role });
for (const role of ['customer', 'provider']) test(`register ${role} persists the role and hashes the password`, async () => {
  const { status, body } = await post('/auth/register', draft(role));
  assert.equal(status, 200);
  assert.equal(users.get(draft(role).email).role, role);
  assert.ok(await bcrypt.compare('Example123', users.get(draft(role).email).passwordHash));
  assert.equal(body.data.user.role, role);
  assert.equal(body.data.user.passwordHash, undefined);
  assert.equal(body.data.user.password, undefined);
});
for (const role of ['admin', 'invalid', null]) test(`public registration rejects role ${role}`, async () => {
  const size = users.size;
  assert.equal((await post('/auth/register', draft(role))).status, 400);
  assert.equal(users.size, size);
});
test('registration validates fields without echoing passwords', async () => {
  const result = await post('/auth/register', { ...draft('customer'), email: 'bad', fullName: '', phone: '', password: 'private' });
  assert.equal(result.status, 422);
  assert.ok(!JSON.stringify(result.body).includes('private'));
});
test('duplicate email is rejected', async () => assert.equal((await post('/auth/register', draft('customer'))).status, 409));
for (const role of ['customer', 'provider', 'admin']) test(`common login uses database ${role} despite submitted role`, async () => {
  const { status, body } = await post('/auth/login', { email: `${role}@example.invalid`, password: 'Example123', role: 'admin' });
  assert.equal(status, 200);
  assert.equal(body.data.user.role, role);
  assert.equal(body.data.user.passwordHash, undefined);
  for (const area of ['customer', 'provider', 'admin']) {
    const response = await fetch(`${base}/auth/dashboard/${area}`, { headers: { Authorization: `Bearer ${body.data.token}` } });
    assert.equal(response.status, role === area ? 200 : 403);
  }
  if (role !== 'admin') assert.equal((await fetch(`${base}/admin/dashboard`, { headers: { Authorization: `Bearer ${body.data.token}` } })).status, 403);
});
for (const token of [null, 'invalid', jwt.sign({ id: 'none' }, 'wrong-secret')]) test(`protected API rejects missing or invalid token ${token === null ? 'missing' : 'invalid'}`, async () => {
  assert.equal((await fetch(`${base}/admin/dashboard`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })).status, 401);
});
test('invalid credentials are rejected', async () => assert.equal((await post('/auth/login', { email: 'admin@example.invalid', password: 'wrong' })).status, 401));
