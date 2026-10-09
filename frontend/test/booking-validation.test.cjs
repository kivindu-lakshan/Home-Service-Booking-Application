const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  validateBooking,
  validateReschedule,
  validateCancellation,
  isSlotInPast,
} = require("../src/validation/booking.ts");

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const validBooking = {
  serviceId: "507f1f77bcf86cd799439011",
  scheduledDate: tomorrow.toISOString(),
  timePeriod: "morning",
  scheduledTime: "09:30 AM",
  address: "123 Galle Road, Colombo 03",
  notes: "Please ring the bell on arrival",
  paymentMode: "pay_on_completion",
};

test("valid booking passes validation", () => {
  const errors = validateBooking(validBooking);
  assert.deepEqual(errors, {});
});

test("empty booking draft flags all required fields", () => {
  const errors = validateBooking({
    serviceId: "",
    scheduledDate: "",
    timePeriod: "morning",
    scheduledTime: "",
    address: "",
    paymentMode: "pay_on_completion",
  });
  assert.ok(errors.serviceId);
  assert.ok(errors.scheduledDate);
  assert.ok(errors.scheduledTime);
  assert.ok(errors.address);
});

test("address length and character limits are enforced", () => {
  const shortErrors = validateBooking({ ...validBooking, address: "abc" });
  assert.ok(shortErrors.address);

  const longErrors = validateBooking({ ...validBooking, address: "A".repeat(301) });
  assert.ok(longErrors.address);

  const ctrlErrors = validateBooking({ ...validBooking, address: "Valid address\u0000bad" });
  assert.ok(ctrlErrors.address);
});

test("notes length limit is enforced", () => {
  const errors = validateBooking({ ...validBooking, notes: "A".repeat(501) });
  assert.ok(errors.notes);
});

test("isSlotInPast detects past dates and past times today", () => {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1);
  assert.equal(isSlotInPast(pastDate, "10:00 AM"), true);

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 2);
  assert.equal(isSlotInPast(futureDate, "08:00 AM"), false);
});

test("valid reschedule passes validation", () => {
  const errors = validateReschedule({
    currentDate: tomorrow.toISOString(),
    currentTime: "09:30 AM",
    newDate: tomorrow.toISOString(),
    newTime: "02:00 PM",
    notes: "Rescheduling due to meeting",
  });
  assert.deepEqual(errors, {});
});

test("reschedule to the exact same slot is rejected", () => {
  const errors = validateReschedule({
    currentDate: tomorrow.toISOString(),
    currentTime: "09:30 AM",
    newDate: tomorrow.toISOString(),
    newTime: "09:30 AM",
  });
  assert.ok(errors.newTime);
});

test("valid cancellation with standard reason passes", () => {
  const errors = validateCancellation({ reason: "Change of plans" });
  assert.deepEqual(errors, {});
});

test("cancellation with Other allows optional custom reason", () => {
  const emptyCustom = validateCancellation({ reason: "Other", customReason: "" });
  assert.deepEqual(emptyCustom, {});

  const validCustom = validateCancellation({ reason: "Other", customReason: "Need to travel urgently" });
  assert.deepEqual(validCustom, {});

  const longCustom = validateCancellation({ reason: "Other", customReason: "A".repeat(301) });
  assert.ok(longCustom.customReason);
});
