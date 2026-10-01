const router = require("express").Router();
const auth = require("../../middleware/auth");
const controller = require("../../controllers/review/review.controller");
const { body } = require("express-validator");
const validate = require("../../middleware/validate");
router.get("/provider/:providerId", controller.byProvider);
router.get("/booking/:bookingId", auth, controller.byBooking);
router.get("/mine", auth, controller.mine);
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
router.patch(
  "/:id",
  auth,
  [
    body("rating").isInt({ min: 1, max: 5 }),
    body("comment").optional().isString().isLength({ max: 2000 }),
  ],
  validate,
  controller.update,
);
router.delete("/:id", auth, controller.remove);
module.exports = router;
