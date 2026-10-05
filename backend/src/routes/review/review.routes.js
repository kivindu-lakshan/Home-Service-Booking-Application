const router = require("express").Router();
const auth = require("../../middleware/auth");
const controller = require("../../controllers/review/review.controller");
const { body } = require("express-validator");
const validate = require("../../middleware/validate");
router.get("/provider/:providerId", auth, controller.byProvider);
router.get("/booking/:bookingId", auth, controller.byBooking);
router.post(
  "/",
  auth,
  [
    body("bookingId").isMongoId(),
    body("rating").isInt({ min: 1, max: 5 }),
    body("comment").optional().isString().isLength({ max: 2000 }),
  ],
  validate,
  controller.create,
);
module.exports = router;
