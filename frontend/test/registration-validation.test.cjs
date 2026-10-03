const assert = require('node:assert/strict');
const { test } = require('node:test');
const { validateRegistration } = require('../src/validation/auth.ts');
const valid = { fullName: 'Hasini Herath', email: 'hasini@example.com', phone: '0771234567', password: 'Hasini123', confirm: 'Hasini123' };
test('valid registration and trimmed name/email pass', () => {
  assert.deepEqual(validateRegistration(valid), {});
  assert.deepEqual(validateRegistration({ ...valid, fullName: ' Hasini Herath ', email: ' HASINI@EXAMPLE.COM ' }), {});
});
for (const [field, values] of Object.entries({ fullName: ['', '   ', 'H', 'Hasini123', 'Hasini!', 'H'.repeat(101)], email: ['', 'hasini@gmail', 'hasini.com'], phone: ['', '771234567', '07712345', '07712345678', '077ABC4567', '077-1234567'], password: ['', '        ', '12345678', 'password', 'abc12'], confirm: ['', 'Different123'] })) {
  test(`${field} validation rejects invalid input and clears when corrected`, () => {
    for (const value of values) assert.equal(typeof validateRegistration({ ...valid, [field]: value })[field], 'string');
    assert.equal(validateRegistration(valid)[field], undefined);
  });
}
test('confirmation must match exactly and values remain untouched', () => {
  const draft = { ...valid, confirm: 'Hasini123 ' }; const copy = { ...draft };
  assert.equal(validateRegistration(draft).confirm, 'Passwords do not match.');
  assert.deepEqual(draft, copy);
});
