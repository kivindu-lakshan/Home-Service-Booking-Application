const { User } = require("../../models");
const { ok, fail } = require("../../utils/response");
const safe = (location) => location ? {
  areaCity: location.areaCity, source: location.source,
  ...(location.source === "current" ? { latitude: location.latitude, longitude: location.longitude } : {}),
} : null;
exports.read = (req, res) => ok(res, safe(req.user.serviceLocation));
exports.update = async (req, res) => {
  const { areaCity, source, latitude, longitude } = req.body;
  const serviceLocation = { areaCity, source, ...(source === "current" ? { latitude, longitude } : {}) };
  try {
    const user = await User.findOneAndUpdate({ _id: req.user._id, status: "active", role: "customer" },
      { $set: { serviceLocation } }, { new: true, runValidators: true }).select("serviceLocation");
    if (!user) return fail(res, 401, "Your session is no longer active. Please sign in again.");
    return ok(res, safe(user.serviceLocation), "Service location saved.");
  } catch { return fail(res, 500, "Unable to save your service location. Please try again."); }
};
