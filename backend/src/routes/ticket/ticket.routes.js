const router = require("express").Router();
const { body } = require("express-validator");
const auth = require("../../middleware/auth");
const role = require("../../middleware/role");
const validate = require("../../middleware/validate");
const controller = require("../../controllers/ticket/ticket.controller");

router.use(auth);
router.get("/mine", controller.mine);
router.post(
  "/",
  [
    body("subject").trim().isLength({ min: 3, max: 120 }),
    body("message").trim().isLength({ min: 5, max: 4000 }),
  ],
  validate,
  controller.create,
);
router.get("/admin", role("admin"), controller.adminList);
router.patch(
  "/admin/:id",
  role("admin"),
  [
    body("adminResponse").trim().isLength({ min: 1, max: 4000 }),
    body("status").optional().isIn(["in_progress", "resolved"]),
  ],
  validate,
  controller.respond,
);
router.delete("/admin/:id/response", role("admin"), controller.removeResponse);
module.exports = router;
