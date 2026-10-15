/* global __dirname */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadCalendarModule() {
  const filename = path.resolve(__dirname, "../src/utils/calendar.ts");
  const code = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const exports = {};
  const requireMock = (name) => {
    if (name === "react-native") {
      return {
        Platform: { OS: "web" },
        Linking: {
          openURL: async () => true,
          canOpenURL: async () => true,
        },
      };
    }
    return {};
  };

  vm.runInNewContext(output, { exports, require: requireMock, console });
  return exports;
}

const {
  parseBookingDateTime,
  getGoogleCalendarUrl,
  generateIcsContent,
} = loadCalendarModule();

test("parseBookingDateTime correctly parses morning slot and default duration", () => {
  const result = parseBookingDateTime("2026-11-20T00:00:00.000Z", "09:30 AM", "2");
  assert.equal(result.startDate.getHours(), 9);
  assert.equal(result.startDate.getMinutes(), 30);
  // End date should be 2 hours later -> 11:30
  assert.equal(result.endDate.getHours(), 11);
  assert.equal(result.endDate.getMinutes(), 30);
});

test("parseBookingDateTime correctly parses afternoon slot with 1.5 hours duration", () => {
  const result = parseBookingDateTime("2026-11-20T00:00:00.000Z", "02:00 PM", "1.5");
  assert.equal(result.startDate.getHours(), 14);
  assert.equal(result.startDate.getMinutes(), 0);
  // End date should be 1.5 hours later -> 15:30 (03:30 PM)
  assert.equal(result.endDate.getHours(), 15);
  assert.equal(result.endDate.getMinutes(), 30);
});

test("getGoogleCalendarUrl creates a properly encoded Google Calendar URL", () => {
  const details = {
    title: "HomeHalo: AC Repair",
    serviceName: "AC Repair",
    bookingRef: "HH-9921",
    scheduledDate: "2026-11-20T00:00:00.000Z",
    scheduledTime: "10:30 AM",
    durationHours: "2",
    address: "45 Main Street, Kandy",
    providerName: "Kamal Perera",
    notes: "Please call when nearby",
  };

  const url = getGoogleCalendarUrl(details);
  assert.ok(url.startsWith("https://calendar.google.com/calendar/render?action=TEMPLATE"));
  assert.ok(url.includes("text=HomeHalo%3A%20AC%20Repair"));
  assert.ok(url.includes("location=45%20Main%20Street%2C%20Kandy"));
  assert.ok(url.includes("Booking%20Reference%3A%20HH-9921"));
  assert.ok(url.includes("Provider%3A%20Kamal%20Perera"));
});

test("generateIcsContent creates compliant iCalendar format with 1-hour alarm reminder", () => {
  const details = {
    title: "HomeHalo: Plumbing Fix",
    serviceName: "Plumbing Fix",
    bookingRef: "HH-1044",
    scheduledDate: "2026-11-20T00:00:00.000Z",
    scheduledTime: "03:00 PM",
    durationHours: "2",
    address: "12 Lake Road, Colombo",
  };

  const ics = generateIcsContent(details);
  assert.ok(ics.includes("BEGIN:VCALENDAR"));
  assert.ok(ics.includes("VERSION:2.0"));
  assert.ok(ics.includes("BEGIN:VEVENT"));
  assert.ok(ics.includes("SUMMARY:HomeHalo: Plumbing Fix"));
  assert.ok(ics.includes("LOCATION:12 Lake Road, Colombo"));
  assert.ok(ics.includes("UID:HH-1044-"));
  assert.ok(ics.includes("BEGIN:VALARM"));
  assert.ok(ics.includes("TRIGGER:-PT1H"));
  assert.ok(ics.includes("END:VALARM"));
  assert.ok(ics.includes("END:VEVENT"));
  assert.ok(ics.includes("END:VCALENDAR"));
});
