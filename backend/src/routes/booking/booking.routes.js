const router = require("express").Router();
const auth = require("../../middleware/auth");
const role = require("../../middleware/role");
const controller = require("../../controllers/booking/booking.controller");

router.post("/", auth, role("customer"), controller.create);
module.exports = router;
