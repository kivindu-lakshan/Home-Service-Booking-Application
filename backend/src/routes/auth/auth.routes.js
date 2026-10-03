const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");
const validate = require("../../middleware/validate");
const controller = require("../../controllers/auth/auth.controller");
const { fail } = require("../../utils/response");
const password = (field) =>
  body(field)
    .isLength({ min: 8 })
    .matches(/[A-Za-z]/)
    .matches(/[0-9]/)
    .withMessage(controller.passwordError);
router.post(
  "/register",
  [
    body("fullName").isString().withMessage("Full name is required.").bail().trim()
      .notEmpty().withMessage("Full name is required.").bail()
      .isLength({ min: 2, max: 100 }).withMessage("Full name must be between 2 and 100 characters.").bail()
      .matches(/^\p{L}[\p{L}\p{M} ]*$/u).withMessage("Full name must contain only letters and spaces.").hide(),
    body("email").isString().withMessage("Email address is required.").bail().trim()
      .notEmpty().withMessage("Email address is required.").bail()
      .isLength({ max: 254 }).isEmail().withMessage("Enter a valid email address.").bail().normalizeEmail().hide(),
    body("phone").isString().withMessage("Phone number is required.").bail().trim()
      .notEmpty().withMessage("Phone number is required.").bail()
      .matches(/^07[0-9]{8}$/).withMessage("Enter a 10-digit Sri Lankan mobile number starting with 07.").hide(),
    body("password").isString().withMessage("Password is required.").bail()
      .notEmpty().withMessage("Password is required.").bail()
      .custom(value => value.length >= 8 && /[A-Za-z]/.test(value) && /[0-9]/.test(value))
      .withMessage(controller.passwordError).hide(),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, 400, "Please correct the highlighted fields.",
      errors.array().map(({ path, msg }) => ({ path, msg })));
    next();
  },
  controller.register,
);
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
    body("role").optional().isIn(["customer", "provider", "admin"]),
  ],
  validate,
  controller.login,
);
const notifications = require("../../controllers/auth/notification-preferences.controller");
const notificationFields = ["bookingConfirmations", "arrivalStatusUpdates", "bookingReminders"];
const noStore = (req, res, next) => { res.set("Cache-Control", "no-store"); next(); };
const appearance = require("../../controllers/auth/appearance.controller");
router.get("/me/appearance", auth, noStore, appearance.read);
router.patch("/me/appearance", auth, noStore, (req, res, next) => {
  const values = req.body;
  if (!values || typeof values !== "object" || Array.isArray(values) || Object.keys(values).length !== 1 ||
      !Object.hasOwn(values, "theme") || !["light", "dark"].includes(values.theme))
    return fail(res, 400, "Provide only theme, with a value of light or dark.");
  next();
}, appearance.update);
router.get("/me/notification-preferences", auth, noStore, notifications.read);
router.patch("/me/notification-preferences", auth, noStore, (req, res, next) => {
  const values = req.body;
  if (!values || typeof values !== "object" || Array.isArray(values) || !Object.keys(values).length ||
      Object.keys(values).some((key) => !notificationFields.includes(key)))
    return fail(res, 400, "Provide only bookingConfirmations, arrivalStatusUpdates and bookingReminders.");
  next();
}, notificationFields.map((key) => body(key).optional()
  .custom((value) => typeof value === "boolean").withMessage("Preference must be true or false.").hide()),
(req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return fail(res, 400, "Validation failed", errors.array());
  next();
}, notifications.update);
router.use("/me/service-location", require("./service-location.routes"));
router.get("/me", auth, controller.me);
router.patch(
  "/me",
  auth,
  (req, res, next) => {
    // Reject unknown fields before validation so submitted secrets are never echoed.
    const fields = req.body;
    if (!fields || typeof fields !== "object" || Array.isArray(fields) ||
        Object.keys(fields).some((key) => !["fullName", "phone"].includes(key))) {
      return fail(res, 400, "Provide only fullName and phone to update your profile.");
    }
    next();
  },
  [
    body("fullName").exists({ values: "null" }).withMessage("Full name is required.")
      .bail().isString().withMessage("Full name must be text.")
      .bail().trim().notEmpty().withMessage("Full name is required.")
      .bail().isLength({ min: 2, max: 100 })
      .withMessage("Full name must be between 2 and 100 characters.")
      .bail().matches(/^\p{L}[\p{L}\p{M} ]*$/u)
      .withMessage("Full name must contain only letters and spaces.").hide(),
    body("phone").exists({ values: "null" }).withMessage("Phone number is required.")
      .bail().isString().withMessage("Phone number must be text.")
      .bail().customSanitizer((value) => value.replace(/\s/g, ""))
      .notEmpty().withMessage("Phone number is required.")
      .bail().matches(/^07[0-9]{8}$/)
      .withMessage("Enter a 10-digit Sri Lankan mobile number starting with 07, e.g. 0771234567.").hide(),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, 400, "Validation failed", errors.array());
    next();
  },
  controller.updateMe,
);
router.post(
  "/change-password",
  auth,
  [body("currentPassword").notEmpty(), password("newPassword")],
  validate,
  controller.changePassword,
);
router.post(
  "/forgot-password",
  [body("email").isEmail().normalizeEmail()],
  validate,
  controller.forgotPassword,
);
router.post(
  "/reset-password",
  [body("token").notEmpty(), password("newPassword")],
  validate,
  controller.resetPassword,
);
router.post(
  "/verify-email",
  auth,
  [body("code").isString().bail().trim().matches(/^[0-9]{6}$/).withMessage("Enter a 6-digit verification code.").hide()],
  validate,
  controller.verifyEmail,
);
router.post("/resend-verification", auth, controller.resendVerification);
router.delete(
  "/me",
  auth,
  [body("password").notEmpty()],
  validate,
  controller.deleteMe,
);
module.exports = router;
