const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
let server, category, service, models; const users = [], files = []; let checks = 0;
const check = (a, b, label) => { assert.deepEqual(a, b, label); checks++; console.log('PASS ' + label); };
(async () => {
 try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  models = require('../src/models'); const tokens = {}; const stamp = Date.now();
  for (const role of ['admin', 'customer', 'provider']) {
   const user = await models.User.create({ fullName: 'Image test ' + role, email: `image-${stamp}-${role}@example.invalid`, passwordHash: 'unused-test-hash', role });
   users.push(user._id); tokens[role] = jwt.sign({ id: String(user._id), role: 'admin' }, process.env.JWT_SECRET);
  }
  category = await models.ServiceCategory.create({ name: 'Image test ' + stamp, isActive: true });
  server = require('../src/app').listen(0); await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const request = async (url, role, method = 'GET', data) => {
   const res = await fetch(base + url, { method, headers: { ...(role ? { Authorization: 'Bearer ' + tokens[role] } : {}), ...(data && !(data instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) }, body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined });
   return { status: res.status, data: await res.json() };
  };
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=', 'base64');
  const form = (bytes = png, type = 'image/png', name = 'test.png') => { const f = new FormData(); f.append('image', new Blob([bytes], { type }), name); return f; };
  check((await request('/admin/services/images', null, 'POST', form())).status, 401, 'Upload requires authentication');
  for (const role of ['customer', 'provider']) check((await request('/admin/services/images', role, 'POST', form())).status, 403, role + ' denied despite forged JWT role');
  check((await request('/admin/services/images', 'admin', 'POST', form(Buffer.from('not PNG')))).status, 400, 'Forged image rejected');
  check((await request('/admin/services/images', 'admin', 'POST', form(png, 'image/svg+xml', 'test.svg'))).status, 400, 'SVG rejected');
  check((await request('/admin/services/images', 'admin', 'POST', form(Buffer.alloc(5 * 1024 * 1024 + 1)))).status, 400, 'Oversized image rejected');
  const multiple = form(); multiple.append('image', new Blob([png], { type: 'image/png' }), 'second.png');
  check((await request('/admin/services/images', 'admin', 'POST', multiple)).status, 400, 'Multiple files rejected');
  const upload = async () => {
   const result = await request('/admin/services/images', 'admin', 'POST', form()); check(result.status, 200, 'Admin image upload');
   const reference = result.data.data.imageUrl; assert.match(reference, /^\/api\/services\/images\/[a-f\d-]{36}\.png$/); files.push(reference.split('/').pop()); return reference;
  };
  const imageUrl = await upload();
  const downloaded = await fetch(base.replace(/\/api$/, '') + imageUrl);
  check(downloaded.status, 200, 'Image can load without bearer header');
  check(downloaded.headers.get('cross-origin-resource-policy'), 'cross-origin', 'Web cross-origin image permitted');
  check(downloaded.headers.get('content-type').startsWith('image/png'), true, 'Image content type');
  check(Buffer.from(await downloaded.arrayBuffer()), png, 'Stored bytes served unchanged');
  check((await request('/services/images/certificate.pdf', null)).status, 404, 'Private document filename not exposed');
  check((await request('/services/images/00000000-0000-0000-0000-000000000000.png', null)).status, 404, 'Missing image returns 404');
  const created = await request('/admin/services', 'admin', 'POST', { name: 'Garden image test ' + stamp, category: String(category._id), basePrice: 2500, imageUrl, isActive: true });
  service = created.data.data?._id; check(created.status, 200, 'Service created with image reference');
  const saved = await models.Service.findById(service).lean(); check(saved.imageUrl, imageUrl, 'MongoDB stores image reference'); check(saved.imageUrl.includes('base64'), false, 'No image base64 in service');
  const verify = async expected => {
   const list = await request('/catalogue/services?categoryId=' + category._id, 'customer'); check(list.data.data.find(s => s._id === service).imageUrl, expected, 'Customer list returns image');
   const detail = await request('/catalogue/services/' + service, 'customer'); check(detail.data.data.imageUrl, expected, 'Customer details returns same image');
  };
  await verify(imageUrl); const replacement = await upload();
  check((await request('/admin/services/' + service, 'admin', 'PATCH', { imageUrl: replacement })).status, 200, 'Image replaced'); await verify(replacement);
  check((await request('/admin/services/' + service, 'admin', 'PATCH', { description: 'Updated description' })).status, 200, 'Other edits retain image'); await verify(replacement);
  check((await request('/admin/services/' + service, 'admin', 'PATCH', { imageUrl: 'data:image/png;base64,abc' })).status, 400, 'Base64 reference rejected');
  check((await request('/admin/services/' + service, 'admin', 'PATCH', { imageUrl: '/api/services/images/../../.env' })).status, 400, 'Traversal reference rejected');
  check((await request('/admin/services/' + service, 'admin', 'PATCH', { imageUrl: '' })).status, 200, 'Image removable'); await verify('');
  console.log(`${checks} service image checks passed.`);
 } catch (error) { console.error(error.message); process.exitCode = 1; }
 finally {
  if (server) await new Promise(r => server.close(r));
  if (models) { if (category) { await models.Service.deleteMany({ category: category._id }); await models.ServiceCategory.deleteOne({ _id: category._id }); } await models.User.deleteMany({ _id: { $in: users } }); }
  const storage = require('../src/controllers/service/service-image.controller').storage;
  for (const name of files) { assert.match(name, /^[a-f\d-]{36}\.png$/); await fs.unlink(path.join(storage, name)).catch(e => { if (e.code !== 'ENOENT') throw e; }); }
  await mongoose.disconnect();
 }
})();
