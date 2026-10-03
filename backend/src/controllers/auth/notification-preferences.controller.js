const { User } = require("../../models");
const { ok, fail } = require("../../utils/response");
const fields = ["bookingConfirmations", "arrivalStatusUpdates", "bookingReminders"];
const safe = (user) => Object.fromEntries(fields.map((key) => [key, user.settings?.notifications?.[key] ?? true]));
exports.read = (req, res) => ok(res, safe(req.user));
exports.update = async (req, res) => {
  try {
    // Dot paths preserve profile data, addresses, and other settings.
    const changes = Object.fromEntries(fields.filter((key) => Object.hasOwn(req.body, key))
      .map((key) => [`settings.notifications.${key}`, req.body[key]]));
    const user = await User.findOneAndUpdate({ _id: req.user._id, status: "active" },
      { $set: changes }, { new: true, runValidators: true }).select("settings.notifications");
    if (!user) return fail(res, 401, "Your session is no longer active. Please sign in again.");
    return ok(res, safe(user), "Notification preferences saved.");
  } catch { return fail(res, 500, "Unable to save notification preferences. Please try again."); }
};
