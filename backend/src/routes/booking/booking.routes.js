const router = require("express").Router();
const auth = require("../../middleware/auth");
const controller = require("../../controllers/booking/booking.controller");

router.use(auth);

router.post("/", controller.create);
router.get("/", controller.list);
router.get("/slots", controller.getAvailableSlots);
router.get("/:id", controller.getById);
router.patch("/:id/reschedule", controller.reschedule);
router.patch("/:id/cancel", controller.cancel);
router.patch("/:id/status", controller.updateStatus);
module.exports = router;
