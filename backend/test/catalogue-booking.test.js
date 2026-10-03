const assert = require('node:assert/strict');
const { before, after, beforeEach, test } = require('node:test');
const { once } = require('node:events');
const { randomBytes } = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { User, ServiceCategory, Service, Provider, Review, Booking, ProviderApplication } = require('../src/models');
const { distance } = require('../src/controllers/catalogue/catalogue.controller');
const ids = { user: '507f1f77bcf86cd799439011', category: '507f1f77bcf86cd799439012', service: '507f1f77bcf86cd799439013', provider: '507f1f77bcf86cd799439014', address: '507f1f77bcf86cd799439015', booking: '507f1f77bcf86cd799439016' };
const secret = randomBytes(32).toString('hex'), oldSecret = process.env.JWT_SECRET;
const originals = [];
function replace(model, key, fn) { originals.push([model, key, model[key]]); model[key] = fn; }
function query(value) { return { populate() { return this; }, select() { return this; }, sort() { return this; }, lean: async () => value }; }
let server, base, role, user, service, provider, rows, created, serviceQuery, providerQuery, failed, duplicate, applicationQuery, approved;
const payload = () => ({ serviceId: ids.service, providerId: ids.provider, addressId: ids.address, scheduledDate: '2099-10-05', scheduledTime: '10:00' });
before(async () => {
  process.env.JWT_SECRET = secret;
  replace(User, 'findById', async () => ({ ...user, role }));
  replace(User, 'exists', async () => ({ _id: ids.user }));
  replace(ServiceCategory, 'find', () => query([{ _id: ids.category, name: 'Existing category' }]));
  replace(Service, 'find', q => { serviceQuery = q; return query([service]); });
  replace(Service, 'findOne', () => query(service));
  replace(Provider, 'find', q => { providerQuery = q; if (failed) throw Error('private database detail'); return query(rows); });
  replace(Provider, 'findOne', () => query(provider));
  replace(ProviderApplication, 'exists', async () => approved ? { _id: ids.booking } : null);
  replace(ProviderApplication, 'find', filter => {
    applicationQuery = filter; if (failed) throw Error('private database detail');
    return query(approved ? rows.map(p => ({ provider: p, service: p.services[0].service, professionalName: p.user.fullName, aboutMe: p.aboutMe, yearsExperience: p.yearsExperience, priceFrom: p.services[0].priceFrom, location: { address: p.city, latitude: p.latitude, longitude: p.longitude } })) : []);
  });
  replace(Review, 'aggregate', async () => []);
  replace(Booking, 'create', async value => { if (duplicate) throw Object.assign(Error('duplicate'), { code: 11000 }); created = value; return { ...value, _id: ids.booking }; });
  replace(Booking, 'findOne', () => ({ populate: async () => null }));
  const app = express(); app.use(express.json());
  app.use('/api/catalogue', require('../src/routes/catalogue/catalogue.routes'));
  app.use('/api/bookings', require('../src/routes/booking/booking.routes'));
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening'); base = `http://127.0.0.1:${server.address().port}/api`;
});
beforeEach(() => {
  role = 'customer'; approved = true; created = null; failed = false; duplicate = false;
  user = { _id: ids.user, status: 'active', addresses: [{ _id: ids.address, line1: 'Saved street', areaCity: 'Colombo', isDefault: true }] };
  service = { _id: ids.service, name: 'Existing service', isActive: true, basePrice: 2500, category: { _id: ids.category, isActive: true }, estDurationHours: '1-3 hours' };
  provider = { _id: ids.provider, user: { _id: ids.user, fullName: 'Existing provider', role: 'provider', status: 'active', email: 'private@example.com' }, status: 'active', city: 'Colombo', isAvailable: true, services: [{ service, priceFrom: 2000 }], availability: [] };
  rows = [provider];
});
after(async () => { originals.forEach(([m,k,v]) => { m[k] = v; }); if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret; await new Promise(resolve => server.close(resolve)); });
async function request(path, method = 'GET', body, authorized = true) {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(authorized ? { Authorization: `Bearer ${jwt.sign({ id: ids.user }, secret)}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: res.status, body: await res.json() };
}
test('catalogue requires authentication', async () => { assert.equal((await request('/catalogue/categories', 'GET', null, false)).status, 401); });
for (const account of ['admin', 'provider']) test(`${account} cannot access customer catalogue or create bookings`, async () => { role = account; assert.equal((await request('/catalogue/categories')).status, 403); assert.equal((await request('/bookings', 'POST', payload())).status, 403); });
test('services constrain category and escape search patterns', async () => {
  assert.equal((await request(`/catalogue/services?categoryId=${ids.category}&search=%5B`)).status, 200);
  assert.equal(serviceQuery.isActive, true); assert.deepEqual(serviceQuery.category.$in, [ids.category]); assert.ok(serviceQuery.$or[0].name.test('[')); assert.ok(!serviceQuery.$or[0].name.test('abc'));
});
test('invalid category, service and provider IDs return 400', async () => { for (const path of ['/catalogue/services?categoryId=bad', '/catalogue/services/bad', '/catalogue/providers/bad']) assert.equal((await request(path)).status, 400); });
test('inactive category hides service details', async () => { service.category.isActive = false; assert.equal((await request(`/catalogue/services/${ids.service}`)).status, 404); });
test('provider list uses service membership, safe user fields and stored location', async () => {
  const result = await request(`/catalogue/services/${ids.service}/providers`);
  assert.equal(applicationQuery.service, ids.service); assert.equal(applicationQuery.status, 'approved'); assert.equal(result.body.data.providers[0].user.email, undefined); assert.equal(result.body.data.providers[0].location.city, 'Colombo'); assert.equal(result.body.data.providers[0].priceFrom, 2000);
});
test('search providers by name and city', async () => { assert.equal((await request(`/catalogue/services/${ids.service}/providers?search=missing`)).body.data.providers.length, 0); });
test('lowest price sorts missing values last without inventing prices', async () => {
  rows = [{ ...provider, services: [{ service: { ...service, basePrice: undefined } }] }, provider];
  const result = await request(`/catalogue/services/${ids.service}/providers?filter=lowest_price`); assert.equal(result.body.data.providers[0].priceFrom, 2000); assert.equal(result.body.data.providers[1].priceFrom, undefined);
});
test('nearest is unavailable without saved coordinates', async () => { assert.equal((await request(`/catalogue/services/${ids.service}/providers?filter=nearest`)).status, 422); });
test('nearest sorts using customer and provider coordinates', async () => {
  Object.assign(user.addresses[0], { latitude: 6.9, longitude: 79.8 });
  rows = [{ ...provider, latitude: 7.1, longitude: 80.1 }, { ...provider, latitude: 6.9, longitude: 79.81 }];
  const result = await request(`/catalogue/services/${ids.service}/providers?filter=nearest`); assert.equal(result.body.data.nearestSupported, true); assert.ok(result.body.data.providers[0].distanceKm < result.body.data.providers[1].distanceKm); assert.equal(distance({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 }), 0);
});
test('provider details rejects a service the provider does not offer', async () => { assert.equal((await request(`/catalogue/providers/${ids.provider}?serviceId=${ids.category}`)).status, 404); });
test('provider location comes from approved application location', async () => { const result = await request(`/catalogue/providers/${ids.provider}/location`); assert.equal(result.body.data.city, 'Colombo'); });
test('inactive provider user is hidden', async () => { provider.user.status = 'suspended'; assert.equal((await request(`/catalogue/services/${ids.service}/providers`)).body.data.providers.length, 0); });
test('service ratings are omitted when no reviews exist', async () => { assert.equal((await request(`/catalogue/services/${ids.service}`)).body.data.ratingAvg, undefined); });
test('booking uses customer owner, provider price and saved address, then returns existing booking ID', async () => {
  // Creation uses the unpopulated service reference, exactly as stored by MongoDB.
  provider.services[0].service = ids.service;
  const result = await request('/bookings', 'POST', payload());
  assert.equal(result.status, 201); assert.equal(result.body.data._id, ids.booking); assert.equal(created.customer, ids.user); assert.equal(created.serviceFee, 2000); assert.equal(created.totalPrice, 2000); assert.equal(created.addressSnapshot, 'Saved street, Colombo'); assert.equal(created.status, 'pending'); assert.equal(created.scheduledTime, '10:00 AM'); assert.equal(created.paymentMode, 'pay_on_completion');
});
test('customer cannot inject price, owner or status', async () => { for (const key of ['totalPrice', 'customer', 'status']) assert.equal((await request('/bookings', 'POST', { ...payload(), [key]: 'injected' })).status, 400); assert.equal(created, null); });
test('booking rejects another customer address', async () => { assert.equal((await request('/bookings', 'POST', { ...payload(), addressId: ids.category })).status, 400); });
test('booking rejects impossible and past dates', async () => { for (const date of ['2099-02-30', '2000-01-01']) assert.equal((await request('/bookings', 'POST', { ...payload(), scheduledDate: date })).status, 400); });
test('booking rejects an unavailable provider', async () => { provider = null; assert.equal((await request('/bookings', 'POST', payload())).status, 409); });
test('booking enforces published availability', async () => { provider.availability = [{ dayOfWeek: 0, startTime: '08:00', endTime: '09:00', isAvailable: true }]; assert.equal((await request('/bookings', 'POST', payload())).status, 409); });
test('unique slot conflict returns actionable 409', async () => { duplicate = true; provider.services[0].service = ids.service; assert.equal((await request('/bookings', 'POST', payload())).status, 409); });
test('booking details is scoped to current customer', async () => { let filter; Booking.findOne = q => { filter = q; return { populate: async () => null }; }; assert.equal((await request(`/bookings/${ids.booking}`)).status, 404); assert.equal(filter.customer, ids.user); });
test('database errors do not expose internals', async () => { failed = true; const result = await request(`/catalogue/services/${ids.service}/providers`); assert.equal(result.status, 500); assert.ok(!JSON.stringify(result).includes('private database')); });

test('unapproved provider is hidden from catalogue and cannot receive new bookings', async () => {
  approved = false;
  assert.equal((await request(`/catalogue/services/${ids.service}/providers`)).body.data.providers.length, 0);
  assert.equal((await request(`/catalogue/providers/${ids.provider}`)).status, 404);
  assert.equal((await request('/bookings', 'POST', payload())).status, 409);
  assert.equal(created, null);
});
