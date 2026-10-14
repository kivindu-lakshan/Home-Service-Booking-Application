const mongoose = require("mongoose");
const { Service, ServiceCategory, Provider } = require("../../models");
const { ok, fail } = require("../../utils/response");
const fields = [
  "name",
  "category",
  "description",
  "basePrice",
  "imageUrl",
  "estDurationHours",
  "serviceType",
  "inclusions",
  "isActive",
];
const isId = (value) =>
  typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
const categoryFields = "name icon sortOrder isActive";
const serviceFields =
  "name category description basePrice imageUrl estDurationHours serviceType inclusions isActive createdAt updatedAt";
const {
  approvedApplications,
  publicProvider,
} = require("../../utils/approved-providers");
const providerFields = "user city ratingAvg reviewCount services";

async function withProviders(services) {
  const isList = Array.isArray(services);
  const items = isList ? services : [services];
  const ids = items.map((service) => service._id);
  const applications =
    Provider.db.readyState === 1
      ? await approvedApplications({ service: { $in: ids } })
      : [];
  const result = items.map((service) => {
    const assignedProviders = applications
      .filter((a) => String(a.service?._id) === String(service._id))
      .map((a) => publicProvider(a))
      .filter(Boolean)
      .map((p) => ({
        _id: p._id,
        user: p.user,
        city: p.location.city,
        ratingAvg: p.ratingAvg,
        reviewCount: p.reviewCount,
      }));
    return {
      ...(typeof service.toObject === "function"
        ? service.toObject()
        : service),
      assignedProviders,
    };
  });
  return isList ? result : result[0];
}

exports.validateId = (req, res, next) =>
  isId(req.params.id) ? next() : fail(res, 400, "Invalid service ID.");
exports.validateService = async (req, res, next) => {
  try {
    const body = req.body;
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      !Object.keys(body).length ||
      Object.keys(body).some((key) => !fields.includes(key))
    )
      return fail(res, 400, "Provide only supported service fields.");
    const changes = {};
    const errors = [];
    const create = req.method === "POST";
    for (const key of ["name", "category", "basePrice"]) {
      if (create && !Object.hasOwn(body, key))
        errors.push({
          path: key,
          msg: `${key === "basePrice" ? "Starting price" : key === "category" ? "Category" : "Service name"} is required.`,
        });
    }
    for (const [key, limit] of [
      ["name", 120],
      ["description", 4000],
      ["estDurationHours", 100],
      ["imageUrl", 2048],
    ]) {
      if (!Object.hasOwn(body, key)) continue;
      if (
        typeof body[key] !== "string" ||
        body[key].trim().length > limit ||
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(body[key])
      ) {
        errors.push({
          path: key,
          msg: `Enter valid text of at most ${limit} characters.`,
        });
        continue;
      }
      changes[key] = body[key].trim();
      if (key === "name" && changes[key].length < 2)
        errors.push({
          path: key,
          msg: "Service name must contain at least 2 characters.",
        });
      if (
        key === "imageUrl" &&
        changes[key] &&
        !/^\/api\/services\/images\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\.(png|jpe?g)$/i.test(
          changes[key],
        )
      ) {
        try {
          const url = new URL(changes[key]);
          if (
            !["https:", "http:"].includes(url.protocol) ||
            url.username ||
            url.password
          )
            throw new Error();
        } catch {
          errors.push({
            path: key,
            msg: "Enter a valid HTTP or HTTPS image URL.",
          });
        }
      }
    }
    if (Object.hasOwn(body, "basePrice")) {
      if (
        typeof body.basePrice !== "number" ||
        !Number.isFinite(body.basePrice) ||
        body.basePrice < 0 ||
        body.basePrice > 100000000
      )
        errors.push({
          path: "basePrice",
          msg: "Starting price must be a number between 0 and 100,000,000.",
        });
      else changes.basePrice = body.basePrice;
    }
    if (Object.hasOwn(body, "category")) {
      if (!isId(body.category))
        errors.push({ path: "category", msg: "Select an existing category." });
      else if (!(await ServiceCategory.exists({ _id: body.category })))
        errors.push({
          path: "category",
          msg: "The selected category no longer exists.",
        });
      else changes.category = body.category;
    }
    if (Object.hasOwn(body, "serviceType")) {
      if (!["on_site", "workshop"].includes(body.serviceType))
        errors.push({
          path: "serviceType",
          msg: "Choose On site or Workshop.",
        });
      else changes.serviceType = body.serviceType;
    }
    if (Object.hasOwn(body, "isActive")) {
      if (typeof body.isActive !== "boolean")
        errors.push({ path: "isActive", msg: "Status must be true or false." });
      else changes.isActive = body.isActive;
    }
    if (Object.hasOwn(body, "inclusions")) {
      if (
        !Array.isArray(body.inclusions) ||
        body.inclusions.length > 30 ||
        body.inclusions.some(
          (value) =>
            typeof value !== "string" ||
            !value.trim() ||
            value.trim().length > 200,
        )
      )
        errors.push({
          path: "inclusions",
          msg: "Provide up to 30 inclusions, each 1â€“200 characters.",
        });
      else changes.inclusions = body.inclusions.map((value) => value.trim());
    }
    if (errors.length)
      return fail(res, 400, "Please correct the highlighted fields.", errors);
    req.serviceChanges = changes;
    next();
  } catch {
    return fail(res, 500, "Unable to validate this service. Please try again.");
  }
};

exports.categories = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const filter = req.user.role === "admin" ? {} : { isActive: true };
    return ok(
      res,
      await ServiceCategory.find(filter)
        .select(categoryFields)
        .sort({ sortOrder: 1, name: 1 }),
    );
  } catch {
    return fail(res, 500, "Unable to load service categories.");
  }
};
exports.list = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const category = req.query.category;
    if (category !== undefined && !isId(category))
      return fail(res, 400, "Invalid category ID.");
    const filter = {};
    if (!req.adminServices) {
      filter.isActive = true;
      const activeCategories = await ServiceCategory.find({
        isActive: true,
      }).select("_id");
      filter.category = { $in: activeCategories.map((item) => item._id) };
    }
    if (category) {
      if (filter.category)
        filter.category.$in = filter.category.$in.filter(
          (id) => String(id) === category,
        );
      else filter.category = category;
    }
    const services = await Service.find(filter)
      .select(serviceFields)
      .populate("category", categoryFields)
      .sort({ name: 1, _id: 1 });
    return ok(res, await withProviders(services));
  } catch {
    return fail(res, 500, "Unable to load services. Please try again.");
  }
};
exports.read = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const service = await Service.findById(req.params.id)
      .select(serviceFields)
      .populate("category", categoryFields);
    if (!service) return fail(res, 404, "Service not found.");
    return ok(res, await withProviders(service));
  } catch {
    return fail(res, 500, "Unable to load this service.");
  }
};
exports.create = async (req, res) => {
  try {
    const service = await Service.create(req.serviceChanges);
    await service.populate("category", categoryFields);
    return ok(res, service, "Service created.");
  } catch {
    return fail(res, 500, "Unable to create this service. Please try again.");
  }
};
exports.update = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { $set: req.serviceChanges },
      { new: true, runValidators: true },
    ).populate("category", categoryFields);
    if (!service) return fail(res, 404, "Service not found.");
    return ok(res, service, "Service updated.");
  } catch {
    return fail(res, 500, "Unable to update this service. Please try again.");
  }
};
exports.remove = async (req, res) => {
  try {
    // Preserve existing Provider, Booking and Review references.
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true, runValidators: true },
    );
    if (!service) return fail(res, 404, "Service not found.");
    return ok(
      res,
      { id: service._id, isActive: false },
      "Service deactivated.",
    );
  } catch {
    return fail(res, 500, "Unable to deactivate this service.");
  }
};

exports.providers = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).select("_id name");
    if (!service) return fail(res, 404, "Service not found.");
    return ok(
      res,
      await Provider.find({ status: "active" })
        .select(providerFields)
        .populate("user", "fullName email")
        .then((providers) =>
          providers.map((provider) => ({
            ...provider.toObject(),
            assigned: provider.services.some(
              (item) => String(item.service) === String(service._id),
            ),
          })),
        ),
    );
  } catch {
    return fail(res, 500, "Unable to load service providers.");
  }
};

exports.assignProviders = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).select("_id name");
    const providerIds = Array.isArray(req.body.providerIds)
      ? req.body.providerIds
      : null;
    if (!service || !providerIds || providerIds.some((id) => !isId(id)))
      return fail(res, 400, "Select valid providers.");
    const providers = await Provider.find({
      _id: { $in: providerIds },
      status: "active",
    }).select("_id");
    if (providers.length !== providerIds.length)
      return fail(res, 400, "Every selected provider must be active.");
    await Provider.updateMany(
      { status: "active" },
      { $pull: { services: { service: service._id } } },
    );
    if (providerIds.length)
      await Provider.updateMany(
        { _id: { $in: providerIds } },
        { $addToSet: { services: { service: service._id } } },
      );
    return ok(res, await withProviders(service), "Service providers updated.");
  } catch {
    return fail(res, 500, "Unable to assign service providers.");
  }
};
