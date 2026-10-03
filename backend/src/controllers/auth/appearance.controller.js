const { User } = require("../../models");
const { ok, fail } = require("../../utils/response");
exports.read = (req, res) => ok(res, { theme: req.user.settings?.theme === "dark" ? "dark" : "light" });
exports.update = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate({ _id: req.user._id, status: "active" },
      { $set: { "settings.theme": req.body.theme } }, { new: true, runValidators: true }).select("settings.theme");
    if (!user) return fail(res, 401, "Your session is no longer active. Please sign in again.");
    return ok(res, { theme: user.settings.theme }, "Appearance saved.");
  } catch { return fail(res, 500, "Unable to save appearance. Please try again."); }
};
