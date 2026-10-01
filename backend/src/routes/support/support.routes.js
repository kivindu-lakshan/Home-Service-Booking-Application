const router = require("express").Router();
const { body, param, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");
const role = require("../../middleware/role");
const { supportCategories } = require("../../models");
const { fail } = require("../../utils/response");
const controller = require("../../controllers/support/support.controller");
const fields = ["category", "subject", "description"];
const permitted = (req, res, next) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body) || !Object.keys(req.body).length || Object.keys(req.body).some((key) => !fields.includes(key)))
    return fail(res, 400, "Provide only category, subject and description.");
  next();
};
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return fail(res, 400, "Validation failed", errors.array());
  next();
};
const rules = (partial = false) => fields.map((field) => {
  const rule = body(field);
  if (partial) rule.optional();
  rule.isString().withMessage(`${field} must be text.`).bail().trim();
  if (field === "category") return rule.isIn(supportCategories).withMessage("Choose a valid category.").hide();
  const title = field === "subject" ? "Subject" : "Description";
  const min = field === "subject" ? 3 : 10;
  const max = field === "subject" ? 120 : 2000;
  return rule.notEmpty().withMessage(`${title} is required.`).bail()
    .isLength({ min, max }).withMessage(`${title} must be ${min}-${max} characters.`).bail()
    .custom((value) => !(field === "description" ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u : /[\u0000-\u001f\u007f]/u).test(value))
    .withMessage(`${title} contains invalid control characters.`).hide();
});
const id = () => param("id").isMongoId().withMessage("Invalid request ID.").hide();
router.use(auth, role("customer"));
router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/tickets", controller.list);
router.post("/tickets", permitted, rules(), validate, controller.create);
router.get("/tickets/:id", id(), validate, controller.read);
router.patch("/tickets/:id", id(), permitted, rules(true), validate, controller.update);
router.post("/tickets/:id/cancel", id(), validate, (req, res, next) => {
  if (req.body !== undefined && (req.body === null || typeof req.body !== "object" || Array.isArray(req.body) || Object.keys(req.body).length))
    return fail(res, 400, "Cancellation does not accept fields.");
  next();
}, controller.cancel);
module.exports = router;
