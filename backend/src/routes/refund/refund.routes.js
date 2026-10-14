const router = require("express").Router();
const auth = require("../../middleware/auth");
const role = require("../../middleware/role");
const ctrl = require("../../controllers/refund/refund.controller");

// ── Customer routes (authenticated, any role) ────────────────────────────────
router.get("/eligibility-summary", auth, ctrl.eligibilitySummary);
router.get("/check/:bookingId", auth, ctrl.checkSingle);
router.get("/eligible-bookings", auth, ctrl.eligibleBookings);
router.post("/request", auth, ctrl.create);
router.get("/my-requests", auth, ctrl.myRequests);
router.get("/my-requests/:id", auth, ctrl.myRequest);

// ── Admin routes ─────────────────────────────────────────────────────────────
router.get("/admin/summary", auth, role("admin"), ctrl.adminSummary);
router.get("/admin", auth, role("admin"), ctrl.adminList);
router.get("/admin/:id", auth, role("admin"), ctrl.adminGet);
router.patch("/admin/:id/approve", auth, role("admin"), ctrl.adminApprove);
router.patch("/admin/:id/reject", auth, role("admin"), ctrl.adminReject);

module.exports = router;
