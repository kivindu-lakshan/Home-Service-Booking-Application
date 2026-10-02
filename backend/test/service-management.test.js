const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const { once } = require('node:events');
const express = require('express');
const jwt = require('jsonwebtoken');
const { User, Service, ServiceCategory } = require('../src/models');
const routes = require('../src/routes/service/service.routes');
const originals = { user: User.findById, find: Service.find, read: Service.findById, create: Service.create, update: Service.findByIdAndUpdate, categories: ServiceCategory.find, exists: ServiceCategory.exists, secret: process.env.JWT_SECRET };
const category = { _id: '507f1f77bcf86cd799439021', name: 'Test category', isActive: true };
const inactiveCategory = { _id: '507f1f77bcf86cd799439022', name: 'Inactive category', isActive: false };
const rows = new Map();
let server, base, createdId;
const secret = 'isolated-service-tests-only-secret';
const categories = [category, inactiveCategory];
const same = (left, right) => String(left) === String(right);
function query(result) {
  let populate = false;
  const q = { select: () => q, sort: () => q, populate: () => { populate = true; return q; }, then(resolve, reject) {
    const value = populate ? (Array.isArray(result) ? result.map(fill) : result ? fill(result) : null) : result;
    return Promise.resolve(value).then(resolve, reject);
  } };
  function fill(row) { return { ...row, category: categories.find(c => same(c._id, row.category)) || null }; }
  return q;
}
before(async () => {
  process.env.JWT_SECRET = secret;
  User.findById = async id => ['admin', 'customer', 'provider'].includes(id) ? { _id: id, role: id, status: 'active' } : null;
  ServiceCategory.exists = async ({ _id }) => categories.some(c => same(c._id, _id));
  ServiceCategory.find = filter => query(categories.filter(c => filter.isActive === undefined || c.isActive === filter.isActive));
  Service.find = filter => query([...rows.values()].filter(row => (filter.isActive === undefined || row.isActive === filter.isActive) && (!filter.category || (filter.category.$in ? filter.category.$in.some(id => same(id, row.category)) : same(filter.category, row.category)))));
  Service.findById = id => query(rows.get(id) || null);
  Service.create = async data => {
    const doc = new Service(data); await doc.validate(); const row = doc.toObject();
    rows.set(String(row._id), row);
    return { ...row, populate: async () => {} };
  };
  Service.findByIdAndUpdate = (id, update) => {
    const row = rows.get(id);
    if (!row) return query(null);
    Object.assign(row, update.$set); return query(row);
  };
  const app = express(); app.use(express.json()); app.use('/api/services', routes); app.use('/api/admin/services', routes.adminRouter);
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening'); base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  User.findById = originals.user; Service.find = originals.find; Service.findById = originals.read; Service.create = originals.create; Service.findByIdAndUpdate = originals.update; ServiceCategory.find = originals.categories; ServiceCategory.exists = originals.exists;
  if (originals.secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = originals.secret;
  await new Promise(resolve => server.close(resolve));
});
async function request(path, role = 'admin', method = 'GET', body) {
  const response = await fetch(base + path, { method, headers: { ...(role && { Authorization: `Bearer ${jwt.sign({ id: role, role: 'admin' }, secret)}` }), 'Content-Type': 'application/json' }, ...(body !== undefined && { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json(), cache: response.headers.get('cache-control') };
}
const draft = { name: 'Test service', category: category._id, description: 'Test description', basePrice: 100, imageUrl: '', estDurationHours: '1–2 hours', serviceType: 'on_site', inclusions: ['Inspection'], isActive: true };
test('admin creates a service in the existing schema', async () => {
  const result = await request('/admin/services', 'admin', 'POST', draft);
  assert.equal(result.status, 200); createdId = String(result.body.data._id);
  assert.equal(rows.get(createdId).category.toString(), category._id);
});
for (const role of ['customer', 'provider', 'admin']) test(`${role} retrieves the same active service`, async () => {
  const result = await request('/services', role);
  assert.equal(result.status, 200); assert.equal(result.cache, 'no-store');
  assert.equal(result.body.data[0]._id, createdId); assert.equal(result.body.data[0].category.name, category.name);
});
test('admin edits existing service and public readers get updated data', async () => {
  assert.equal((await request(`/admin/services/${createdId}`, 'admin', 'PATCH', { name: 'Updated service', basePrice: 250 })).status, 200);
  const result = await request('/services', 'provider'); assert.equal(result.body.data[0].name, 'Updated service'); assert.equal(result.body.data[0].basePrice, 250);
});
test('delete deactivates without removing referenced record; admin can restore it', async () => {
  assert.equal((await request(`/admin/services/${createdId}`, 'admin', 'DELETE')).status, 200);
  assert.ok(rows.has(createdId)); assert.equal(rows.get(createdId).isActive, false);
  assert.equal((await request('/services', 'customer')).body.data.length, 0);
  assert.equal((await request('/admin/services')).body.data[0].isActive, false);
  assert.equal((await request(`/admin/services/${createdId}`, 'admin', 'PATCH', { isActive: true })).status, 200);
});
test('inactive categories hide services from shared read endpoint', async () => {
  await request('/admin/services', 'admin', 'POST', { ...draft, category: inactiveCategory._id });
  assert.equal((await request('/services', 'provider')).body.data.length, 1);
  assert.equal((await request('/admin/services')).body.data.length, 2);
});
for (const role of ['customer', 'provider']) for (const prefix of ['/services', '/admin/services']) for (const method of ['POST', 'PATCH', 'DELETE']) test(`${role} cannot ${method} ${prefix}, even with admin token claim`, async () => {
  const result = await request(prefix + (method === 'POST' ? '' : `/${createdId}`), role, method, method === 'DELETE' ? undefined : draft);
  assert.equal(result.status, 403);
});
for (const path of ['/services', '/services/categories', '/admin/services']) test(`missing token returns 401 for ${path}`, async () => assert.equal((await request(path, null)).status, 401));
for (const body of [{}, { ...draft, name: '' }, { ...draft, category: 'bad' }, { ...draft, category: '507f1f77bcf86cd799439023' }, { ...draft, basePrice: -1 }, { ...draft, basePrice: '100' }, { ...draft, isActive: 'true' }, { ...draft, imageUrl: 'javascript:alert(1)' }, { ...draft, serviceType: 'other' }, { ...draft, inclusions: [''] }, { ...draft, role: 'admin' }, { ...draft, $set: { name: 'injected' } }]) test(`invalid payload is rejected: ${JSON.stringify(body).slice(0,80)}`, async () => {
  const count = rows.size; assert.equal((await request('/admin/services', 'admin', 'POST', body)).status, 400); assert.equal(rows.size, count);
});
test('missing service returns 404 and malformed ID returns 400', async () => {
  assert.equal((await request('/admin/services/507f1f77bcf86cd799439099')).status, 404);
  assert.equal((await request('/admin/services/bad', 'admin', 'PATCH', { name: 'Name' })).status, 400);
});
test('category filters and category lists use existing category IDs', async () => {
  assert.equal((await request('/services?category=bad', 'customer')).status, 400);
  assert.equal((await request(`/services?category=${inactiveCategory._id}`, 'provider')).body.data.length, 0);
  assert.equal((await request('/services/categories', 'customer')).body.data.length, 1);
  assert.equal((await request('/services/categories')).body.data.length, 2);
});
