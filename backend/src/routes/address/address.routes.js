const router = require("express").Router();
const { body, param, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");
const { fail } = require("../../utils/response");
const controller = require("../../controllers/address/address.controller");

const fields = ["label", "line1", "areaCity", "landmark", "isDefault"];
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return fail(res, 400, "Validation failed", errors.array());
  next();
};
const permittedFields = (req, res, next) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body) ||
      !Object.keys(req.body).length || Object.keys(req.body).some((key) => !fields.includes(key))) {
    return fail(res, 400, "Provide only address label, street, city, landmark and default preference.");
  }
  next();
};
function addressValidation(partial = false) {
  const rules = [["label", "Address label", 40], ["line1", "Street address", 200], ["areaCity", "City / Area", 100]];
  return [
    ...rules.map(([key, title, max]) => {
      const rule = body(key);
      if (partial) rule.optional();
      return rule.isString().withMessage(`${title} is required and must be text.`)
        .bail().trim().notEmpty().withMessage(`${title} is required.`)
        .bail().isLength({ max }).withMessage(`${title} must be ${max} characters or fewer.`)
        .bail().custom((value) => !/[\u0000-\u001f\u007f]/u.test(value))
        .withMessage(`${title} cannot contain control characters.`).hide();
    }),
    body("landmark").optional().isString().withMessage("Landmark must be text.")
      .bail().trim().isLength({ max: 200 }).withMessage("Landmark must be 200 characters or fewer.")
      .bail().custom((value) => !/[\u0000-\u001f\u007f]/u.test(value))
      .withMessage("Landmark cannot contain control characters.").hide(),
    body("isDefault").optional().custom((value) => typeof value === "boolean")
      .withMessage("Default preference must be true or false.").hide(),
  ];
}
const addressId = () => param("id").isMongoId().withMessage("Invalid address ID.").hide();

router.use(auth);
router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
router.get("/", controller.list);
router.post("/", permittedFields, addressValidation(), validate, controller.create);
router.get("/:id", addressId(), validate, controller.read);
router.patch("/:id", addressId(), permittedFields, addressValidation(true), validate, controller.update);
router.delete("/:id", addressId(), validate, controller.remove);
module.exports = router;
