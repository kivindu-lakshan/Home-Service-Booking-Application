const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../..").replace(/\\/g, "/");
require(root + "/backend/node_modules/dotenv").config({
  path: root + "/.env",
  quiet: true,
});
const m = require(root + "/backend/node_modules/mongoose");
const jwt = require(root + "/backend/node_modules/jsonwebtoken");

let server;
const createdUserIds = [];
const createdBookingIds = [];

(async () => {
  try {
    await m.connect(process.env.MONGODB_URI);
    const { User, Service, Booking, ServiceCategory } = require(root + "/backend/src/models");
    const app = require(root + "/backend/src/app");

    server = app.listen(0);
    await new Promise((r) => server.once("listening", r));
    const base = "http://127.0.0.1:" + server.address().port + "/api/bookings";

    let checks = 0;
    const check = (actual, expected, label) => {
      assert.equal(actual, expected, label);
      checks++;
      console.log("PASS: " + label);
    };

    // 1. Unauthenticated requests should be 401
    const unauthGet = await fetch(base);
    check(unauthGet.status, 401, "GET /api/bookings without token returns 401");

    const unauthPost = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    check(unauthPost.status, 401, "POST /api/bookings without token returns 401");

    // 2. Create test customer
    const testCustomer = await User.create({
      fullName: "Booking Test Customer",
      email: `customer-test-${Date.now()}@example.invalid`,
      phone: "0779998877",
      passwordHash: "test-hash",
      role: "customer",
    });
    createdUserIds.push(testCustomer._id);

    const token = jwt.sign({ id: String(testCustomer._id) }, process.env.JWT_SECRET);
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // 3. Find or create an active service
    let service = await Service.findOne({ isActive: true });
    if (!service) {
      let category = await ServiceCategory.findOne({ isActive: true });
      if (!category) {
        category = await ServiceCategory.create({ name: "Test Category " + Date.now() });
      }
      service = await Service.create({
        name: "Test Plumbing Service",
        category: category._id,
        basePrice: 2500,
        estDurationHours: "1-2 hours",
        isActive: true,
      });
    }

    // 4. Test validation: Past date rejected
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const pastRes = await fetch(base, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        serviceId: String(service._id),
        scheduledDate: pastDate.toISOString(),
        timePeriod: "morning",
        addressSnapshot: "123 Galle Road, Colombo 03",
      }),
    });
    check(pastRes.status, 400, "Past scheduled date rejected with 400");

    // 5. Test valid booking creation
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const createRes = await fetch(base, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        serviceId: String(service._id),
        scheduledDate: futureDate.toISOString(),
        timePeriod: "afternoon",
        scheduledTime: "02:30 PM",
        addressSnapshot: "456 Peradeniya Road, Kandy",
        notes: "Please call before arrival",
        paymentMode: "pay_on_completion",
      }),
    });
    check(createRes.status, 201, "Valid booking created with 201");
    const createdData = await createRes.json();
    check(createdData.success, true, "Response reports success: true");
    check(createdData.data.status, "pending", "Initial status is pending");
    check(createdData.data.timePeriod, "afternoon", "Time period preserved");
    check(createdData.data.scheduledTime, "02:30 PM", "Scheduled time preserved");
    check(createdData.data.bookingRef.startsWith("BK-"), true, "Booking ref has BK- prefix");
    const bookingId = createdData.data._id;
    createdBookingIds.push(bookingId);

    // 6. Test GET list
    const listRes = await fetch(base, { headers: authHeaders });
    check(listRes.status, 200, "List bookings returns 200");
    const listData = await listRes.json();
    check(listData.data.length >= 1, true, "List includes newly created booking");

    // 7. Test GET by ID
    const singleRes = await fetch(`${base}/${bookingId}`, { headers: authHeaders });
    check(singleRes.status, 200, "GET single booking returns 200");
    const singleData = await singleRes.json();
    check(singleData.data.booking.bookingRef, createdData.data.bookingRef, "Single booking matches ref");

    // 8. Test Reschedule
    const newFutureDate = new Date();
    newFutureDate.setDate(newFutureDate.getDate() + 6);
    const rescheduleRes = await fetch(`${base}/${bookingId}/reschedule`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({
        scheduledDate: newFutureDate.toISOString(),
        timePeriod: "evening",
        scheduledTime: "06:00 PM",
        notes: "Shifted to evening",
      }),
    });
    check(rescheduleRes.status, 200, "Reschedule booking returns 200");
    const rescheduledData = await rescheduleRes.json();
    check(rescheduledData.data.timePeriod, "evening", "Rescheduled time period updated");

    // 9. Test Cancel
    const cancelRes = await fetch(`${base}/${bookingId}/cancel`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ reason: "Emergency travel" }),
    });
    check(cancelRes.status, 200, "Cancel booking returns 200");
    const cancelledData = await cancelRes.json();
    check(cancelledData.data.status, "cancelled", "Status updated to cancelled");
    check(cancelledData.data.cancelledReason, "Emergency travel", "Cancellation reason preserved");

    // 10. Attempt to cancel again (should fail)
    const doubleCancelRes = await fetch(`${base}/${bookingId}/cancel`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ reason: "Duplicate cancel attempt" }),
    });
    check(doubleCancelRes.status, 400, "Cancelling an already cancelled booking returns 400");

    console.log(`\nAll ${checks} booking and scheduling integration checks PASSED!`);
  } finally {
    // Cleanup temporary test records
    const { User, Booking } = require(root + "/backend/src/models");
    if (createdBookingIds.length > 0) {
      await Booking.deleteMany({ _id: { $in: createdBookingIds } });
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    if (server) {
      await new Promise((r) => server.close(r));
    }
    await m.disconnect();
  }
})().catch((err) => {
  console.error("Test failed:", err);
  process.exitCode = 1;
});
