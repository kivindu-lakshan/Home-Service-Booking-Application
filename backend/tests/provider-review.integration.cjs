const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
let server, directory, category, services = [], users = [];
let models; let checks = 0;
const check = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; console.log('PASS ' + label); };
(async () => {
 try {
  assert(process.env.MONGODB_URI && process.env.JWT_SECRET, 'Existing MongoDB and JWT environment required');
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'homehalo-phase4-')); process.env.PROVIDER_UPLOAD_DIR = directory;
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  models = require('../src/models'); const { User, Provider, Service, ServiceCategory, ProviderApplication } = models;
  await ProviderApplication.createIndexes();
  const stamp = Date.now(); const tokens = {};
  for (const role of ['admin', 'customer', 'provider', 'pending', 'rejected']) {
   const user = await User.create({ fullName: `Phase4 ${role}`, email: `phase4-${role}-${stamp}@example.invalid`, passwordHash: 'unused-test-hash', role: ['pending', 'rejected'].includes(role) ? 'provider' : role });
   users.push(user._id); tokens[role] = jwt.sign({ id: String(user._id), role: 'admin' }, process.env.JWT_SECRET);
  }
  category = await ServiceCategory.create({ name: `Phase4 ${stamp}`, isActive: true });
  services = await Service.create([{ name: 'Phase4 Pipe Repair', category: category._id, basePrice: 2500 }, { name: 'Phase4 Cleaning', category: category._id, basePrice: 3500 }]);
  server = require('../src/app').listen(0); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const request = async (url, role, method = 'GET', body) => {
   const response = await fetch(base + url, { method, headers: { ...(role ? { Authorization: 'Bearer ' + tokens[role] } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
   return { status: response.status, body: await response.json() };
  };
  const submit = async (role, service = services[0]) => {
   const data = { service: String(service._id), professionalName: `Phase4 ${role}`, phone: '0771234567', yearsExperience: 3, aboutMe: 'Experienced qualified service professional', qualifications: 'Technical diploma', skills: 'Repair and maintenance', priceFrom: 2800, location: { address: 'Panadura test location', latitude: 6.7132, longitude: 79.9026 } };
   const form = new FormData(); form.append('application', JSON.stringify(data)); form.append('documents', new Blob(['%PDF-1.4\nPhase4 test document'], { type: 'application/pdf' }), 'certificate.pdf');
   const result = await request('/provider/applications', role, 'POST', form); check(result.status, 201, `${role} application submitted`); check(result.body.data.status, 'pending', `${role} starts pending`); return result.body.data;
  };
  const approved = await submit('provider'); const pending = await submit('pending'); const rejected = await submit('rejected');
  const route = `/admin/provider-applications/${approved._id}`;
  check((await request(route + '/approve', null, 'PATCH', {})).status, 401, 'Unauthenticated approval denied');
  for (const role of ['customer', 'provider']) { check((await request(route + '/approve', role, 'PATCH', {})).status, 403, `${role} approval denied despite forged JWT role`); check((await request('/admin/provider-applications', role)).status, 403, `${role} admin list denied`); }
  const list = await request('/admin/provider-applications?status=pending', 'admin');
  check(list.status, 200, 'Admin pending list'); check(list.body.data.items.some(item => item._id === approved._id), true, 'Pending application appears');
  const detail = await request(route, 'admin'); check(detail.body.data.provider.user.email.includes('phase4-provider'), true, 'Admin sees provider contact'); check(detail.body.data.location.address, 'Panadura test location', 'Admin sees stored location');
  check(JSON.stringify(detail.body).includes('storageKey'), false, 'Storage paths not exposed');
  const docURL = route + '/documents/' + approved.documents[0]._id;
  check((await fetch(base + docURL)).status, 401, 'Certificate requires auth');
  check((await fetch(base + docURL, { headers: { Authorization: 'Bearer ' + tokens.customer } })).status, 403, 'Customer cannot download certificate');
  const document = await fetch(base + docURL, { headers: { Authorization: 'Bearer ' + tokens.admin } }); check(document.status, 200, 'Admin can download stored certificate'); check((await document.text()).startsWith('%PDF-'), true, 'Real uploaded bytes returned');
  const decisions = await Promise.all([request(route + '/approve', 'admin', 'PATCH', {}), request(route + '/approve', 'admin', 'PATCH', {})]);
  check(decisions.map(r => r.status).sort(), [200, 409], 'Concurrent approval is protected');
  const saved = await ProviderApplication.findById(approved._id); check(saved.status, 'approved', 'Approval persisted'); check(String(saved.reviewedBy), String(users[0]), 'Authenticated admin audit saved'); assert(saved.reviewedAt); checks++;
  check((await User.findById(users[2])).role, 'provider', 'Approval preserves provider role');
  const provider = await Provider.findById(saved.provider); check(provider.services.filter(s => String(s.service) === String(services[0]._id)).length, 1, 'No duplicate service offering');
  check((await request(route + '/reject', 'admin', 'PATCH', {})).status, 409, 'Approved cannot be rejected');
  const rejection = await request(`/admin/provider-applications/${rejected._id}/reject`, 'admin', 'PATCH', { rejectionReason: 'Please upload a clearer certificate.' });
  check(rejection.body.data.status, 'rejected', 'Rejection persisted'); check(rejection.body.data.rejectionReason, 'Please upload a clearer certificate.', 'Rejection reason saved');
  check((await request(`/admin/provider-applications/${rejected._id}/approve`, 'admin', 'PATCH', {})).status, 409, 'Rejected cannot be approved');
  const customer = await request(`/catalogue/services/${services[0]._id}/providers`, 'customer'); check(customer.status, 200, 'Customer providers query');
  check(customer.body.data.providers.map(p => p._id), [String(saved.provider)], 'Only approved provider for requested service');
  const safe = JSON.stringify(customer.body); for (const field of ['passwordHash', 'documents', 'rejectionReason', 'reviewedBy', 'reviewedAt', 'qualifications', 'storageKey', 'email', 'phone']) check(safe.includes('"' + field + '"'), false, `${field} excluded from customer response`);
  check((await request(`/catalogue/services/${services[1]._id}/providers`, 'customer')).body.data.providers.length, 0, 'Approval does not apply to other services');
  check((await request(`/catalogue/providers/${saved.provider}?serviceId=${services[1]._id}`, 'customer')).status, 404, 'Direct detail cannot bypass service approval');
  const pendingProvider = (await ProviderApplication.findById(pending._id)).provider;
  check((await request(`/catalogue/providers/${pendingProvider}`, 'customer')).status, 404, 'Pending provider detail hidden');
  check((await request('/provider/applications', 'rejected')).body.data.find(a => a._id === rejected._id).rejectionReason, 'Please upload a clearer certificate.', 'Provider sees own status reason');
  check((await request('/provider/applications', 'pending')).body.data.some(a => a._id === rejected._id), false, 'Other provider rejection stays private');
  check((await request('/admin/provider-applications/000000000000000000000000', 'admin')).status, 404, 'Missing application returns 404');
  check((await request('/admin/provider-applications?status=invalid', 'admin')).status, 400, 'Invalid status returns 400');
  console.log(`PASS ${checks} Phase4 integration checks`);
 } finally {
  if (server) await new Promise(resolve => server.close(resolve));
  if (models && mongoose.connection.readyState === 1) {
   const providers = await models.Provider.find({ user: { $in: users } }).select('_id'); const ids = providers.map(p => p._id);
   await models.ProviderApplication.deleteMany({ provider: { $in: ids } }); await models.ProviderLocation.deleteMany({ provider: { $in: ids } }); await models.Provider.deleteMany({ _id: { $in: ids } }); await models.User.deleteMany({ _id: { $in: users } });
   await models.Service.deleteMany({ _id: { $in: services.map(s => s._id) } }); if (category) await models.ServiceCategory.deleteOne({ _id: category._id });
  }
  await mongoose.disconnect(); if (directory) await fs.rm(directory, { recursive: true, force: true });
 }
})().catch(error => { console.error(error.name + ': ' + error.message); process.exitCode = 1; });
