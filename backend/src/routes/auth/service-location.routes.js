const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");
const role = require("../../middleware/role");
const { fail } = require("../../utils/response");
const controller = require("../../controllers/auth/service-location.controller");
router.use(auth, role("customer"));
router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/", controller.read);
router.patch("/", (req, res, next) => {
  const values = req.body;
  if (!values || typeof values !== "object" || Array.isArray(values) || Object.keys(values).some((key) => !["areaCity", "source", "latitude", "longitude"].includes(key)))
    return fail(res, 400, "Provide only areaCity, source and optional coordinates.");
  next();
}, [
  body("areaCity").isString().withMessage("Area or city is required.").bail().trim().notEmpty().withMessage("Area or city is required.").bail()
    .isLength({ max: 120 }).withMessage("Area or city must be 120 characters or fewer.").bail()
    .custom((value) => !/[\u0000-\u001f\u007f]/u.test(value)).withMessage("Area or city contains invalid characters.").hide(),
  body("source").isIn(["manual", "current"]).withMessage("Choose manual or current location.").hide(),
  ...[["latitude", 90], ["longitude", 180]].map(([field, limit]) => body(field).custom((value, { req }) => {
    if (req.body.source === "manual") return value === undefined;
    return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;
  }).withMessage("Current location requires valid coordinates; manual entry must not include coordinates.").hide()),
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return fail(res, 400, "Validation failed", errors.array());
  next();
}, controller.update);
module.exports = router;
