const router = require("express").Router();
const adminRouter = require("express").Router();
const auth = require("../../middleware/auth");
const role = require("../../middleware/role");
const ctrl = require("../../controllers/refund/refund.controller");

// Logs every approve/reject call so you can see in the server console
// whether the admin screen's request actually reaches the backend.
const logAction = (action) => (req, _res, next) => {
    console.log(
        `[refunds] ${action} -> ${req.method} ${req.originalUrl} id=${req.params.id} body=${JSON.stringify(req.body || {})}`
    );
    next();
};

const METHODS = ["patch", "put", "post"];

// ── Customer routes (authenticated, any role) ────────────────────────────────
router.get("/eligibility-summary", auth, ctrl.eligibilitySummary);
router.get("/check/:bookingId", auth, ctrl.checkSingle);
router.get("/eligible-bookings", auth, ctrl.eligibleBookings);
router.post("/request", auth, ctrl.create);
router.get("/my-requests", auth, ctrl.myRequests);
router.get("/my-requests/:id", auth, ctrl.myRequest);

// ── Admin routes at /api/refunds/admin/... ───────────────────────────────────
router.get("/admin/summary", auth, role("admin"), ctrl.adminSummary);
router.get("/admin", auth, role("admin"), ctrl.adminList);
router.get("/admin/:id", auth, role("admin"), ctrl.adminGet);

for (const method of METHODS) {
    for (const path of ["approve", "accept"]) {
        router[method](
            `/admin/:id/${path}`,
            logAction("approve"),
            auth,
            role("admin"),
            ctrl.adminApprove
        );
    }
    router[method](
        "/admin/:id/reject",
        logAction("reject"),
        auth,
        role("admin"),
        ctrl.adminReject
    );
}

// ── Same handlers for /api/admin/refunds/... (mount adminRouter there) ───────
adminRouter.get("/summary", auth, role("admin"), ctrl.adminSummary);
adminRouter.get("/", auth, role("admin"), ctrl.adminList);
adminRouter.get("/:id", auth, role("admin"), ctrl.adminGet);

for (const method of METHODS) {
    for (const path of ["approve", "accept"]) {
        adminRouter[method](
            `/:id/${path}`,
            logAction("approve"),
            auth,
            role("admin"),
            ctrl.adminApprove
        );
    }
    adminRouter[method](
        "/:id/reject",
        logAction("reject"),
        auth,
        role("admin"),
        ctrl.adminReject
    );
}

module.exports = router;
module.exports.adminRouter = adminRouter;