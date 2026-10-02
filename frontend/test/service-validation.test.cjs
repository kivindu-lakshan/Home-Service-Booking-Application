/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
const source = fs.readFileSync(path.resolve(__dirname, '../src/validation/service.ts'), 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: exportsObject, URL });
const { validateService, servicePayload, emptyService } = exportsObject;
const valid = { ...emptyService, name: 'Pipe repair', category: '507f1f77bcf86cd799439021', basePrice: '2500', estDurationHours: '1–3 hours' };
test('existing duration formats and zero prices remain supported', () => {
  assert.equal(Object.keys(validateService(valid)).length, 0);
  assert.equal(Object.keys(validateService({ ...valid, basePrice: '0' })).length, 0);
});
test('blank form identifies name, category and price rather than sending a request', () => {
  assert.deepEqual(Object.keys(validateService(emptyService)).sort(), ['basePrice', 'category', 'name']);
});
test('invalid prices, category injection and unsafe image URLs are rejected', () => {
  for (const basePrice of ['', ' ', '-1', 'Infinity', '1e3', '100000001', 'letters']) assert.ok(validateService({ ...valid, basePrice }).basePrice);
  assert.ok(validateService({ ...valid, category: '{$ne:null}' }).category);
  for (const imageUrl of ['javascript:alert(1)', 'file:///private', 'https://user:password@example.com/image.png']) assert.ok(validateService({ ...valid, imageUrl }).imageUrl);
});
test('image URLs, multiline inclusions and empty optional fields produce schema-compatible payloads', () => {
  const result = servicePayload({ ...valid, name: ' Pipe repair ', imageUrl: ' https://example.com/image.png ', basePrice: '2500.50', inclusions: 'Inspection\n\n Repair ' });
  assert.equal(result.name, 'Pipe repair'); assert.equal(result.basePrice, 2500.5);
  assert.equal(result.imageUrl, 'https://example.com/image.png');
  assert.equal(JSON.stringify(result.inclusions), JSON.stringify(['Inspection', 'Repair']));
  assert.equal(result.category, valid.category); assert.equal(result.isActive, true);
});
test('oversized description, duration and inclusions receive field errors', () => {
  const result = validateService({ ...valid, description: 'x'.repeat(4001), estDurationHours: 'x'.repeat(101), inclusions: 'x'.repeat(201) });
  for (const field of ['description', 'estDurationHours', 'inclusions']) assert.ok(result[field]);
});
