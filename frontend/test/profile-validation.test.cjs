const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  validateProfileFields, normalizeProfilePhone, profilePhoneForForm,
} = require("../src/validation/profile.ts");

test("valid names and local mobile numbers pass without changing entered values", () => {
  for (const name of ["Hasini Perera", "  Hasini Perera  ", "අනුකා පෙරේරා", "அனுகா", "Élodie Martin", "李 明", "Al", "A".repeat(100)]) {
    assert.deepEqual(validateProfileFields(name, " 077 123 4567 "), {});
  }
  assert.equal(normalizeProfilePhone(" 077 123 4567 "), "0771234567");
});

test("required, length and character errors belong to the name field", () => {
  for (const name of ["", "   ", "A", "A".repeat(101), "Name123", "Name@Surname", "Anne-Marie", "O'Connor", "Name😀", "Name\nSurname"]) {
    const errors = validateProfileFields(name, "0771234567");
    assert.equal(typeof errors.fullName, "string", name);
    assert.equal(errors.phone, undefined);
  }
  assert.equal(validateProfileFields("   ", "0771234567").fullName, "Full name is required.");
});

test("required and format errors belong to the phone field", () => {
  for (const phone of ["", "   ", "077123456", "07712345678", "0111234567", "+94771234567", "077abc4567", "077-123-4567", "(077)1234567", "0771234567x1"]) {
    const errors = validateProfileFields("Hasini Perera", phone);
    assert.equal(typeof errors.phone, "string", phone);
    assert.equal(errors.fullName, undefined);
  }
  assert.equal(validateProfileFields("Hasini Perera", "   ").phone, "Phone number is required.");
});

test("a blank form reports both required fields", () => {
  assert.deepEqual(validateProfileFields("", ""), {
    fullName: "Full name is required.", phone: "Phone number is required.",
  });
});

test("only existing valid +94 mobile numbers are converted when prefilling", () => {
  assert.equal(profilePhoneForForm("+94 77 123 4567"), "0771234567");
  assert.equal(profilePhoneForForm("0771234567"), "0771234567");
  assert.equal(profilePhoneForForm("+94 11 123 4567"), "+94 11 123 4567");
  assert.equal(profilePhoneForForm("+9477invalid"), "+9477invalid");
  assert.equal(profilePhoneForForm(""), "");
  assert.ok(validateProfileFields("Hasini Perera", "+94771234567").phone);
});
