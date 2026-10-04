const { Router } = require("express");
const auth = require("../../middleware/auth");
const role = require("../../middleware/role");
const controller = require("../../controllers/service/service.controller");
const images = require("../../controllers/service/service-image.controller");
const router = Router();
router.get("/images/:filename", images.read);
router.use(auth, role("customer", "provider", "admin"));
router.get("/categories", controller.categories);
router.get("/", controller.list);
// Also protect attempted writes at the shared URL rather than relying on UI hiding.
router.post("/", role("admin"), controller.validateService, controller.create);
router.patch(
  "/:id",
  role("admin"),
  controller.validateId,
  controller.validateService,
  controller.update,
);
router.delete("/:id", role("admin"), controller.validateId, controller.remove);
const adminRouter = Router();
adminRouter.use(auth, role("admin"), (req, res, next) => {
  req.adminServices = true;
  next();
});
adminRouter.post(
  "/images",
  require("express-rate-limit")({ windowMs: 60000, max: 20 }),
  images.uploadMiddleware,
  images.upload,
);
adminRouter.get("/", controller.list);
adminRouter.get("/:id/providers", controller.validateId, controller.providers);
adminRouter.put(
  "/:id/providers",
  controller.validateId,
  controller.assignProviders,
);
adminRouter.get("/:id", controller.validateId, controller.read);
adminRouter.post("/", controller.validateService, controller.create);
adminRouter.patch(
  "/:id",
  controller.validateId,
  controller.validateService,
  controller.update,
);
adminRouter.delete("/:id", controller.validateId, controller.remove);
module.exports = router;
module.exports.adminRouter = adminRouter;
