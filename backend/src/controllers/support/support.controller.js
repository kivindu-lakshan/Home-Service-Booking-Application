const { SupportTicket } = require("../../models");
const { ok, fail } = require("../../utils/response");
const safe = (ticket) => ({ _id: ticket._id, category: ticket.category, subject: ticket.subject,
  description: ticket.description, status: ticket.status, createdAt: ticket.createdAt, updatedAt: ticket.updatedAt });
const owned = (req) => ({ _id: req.params.id, user: req.user._id });
const fields = (body) => Object.fromEntries(["category", "subject", "description"]
  .filter((key) => Object.hasOwn(body, key)).map((key) => [key, body[key]]));
exports.list = async (req, res) => {
  try { return ok(res, (await SupportTicket.find({ user: req.user._id }).sort({ createdAt: -1, _id: -1 })).map(safe)); }
  catch { return fail(res, 500, "Unable to load support requests. Please try again."); }
};
exports.read = async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne(owned(req));
    return ticket ? ok(res, safe(ticket)) : fail(res, 404, "Support request not found.");
  } catch { return fail(res, 500, "Unable to load support request. Please try again."); }
};
exports.create = async (req, res) => {
  try {
    const ticket = await SupportTicket.create({ ...fields(req.body), user: req.user._id, status: "pending" });
    return ok(res.status(201), safe(ticket), "Support request submitted.");
  } catch { return fail(res, 500, "Unable to submit support request. Please try again."); }
};
async function mutate(req, res, cancel) {
  try {
    // Ownership and state are checked atomically, including concurrent status changes.
    const ticket = await SupportTicket.findOneAndUpdate({ ...owned(req), status: "pending" },
      { $set: cancel ? { status: "cancelled" } : fields(req.body) }, { new: true, runValidators: true });
    if (ticket) return ok(res, safe(ticket), cancel ? "Support request cancelled." : "Support request updated.");
    if (!await SupportTicket.findOne(owned(req))) return fail(res, 404, "Support request not found.");
    return fail(res, 409, "Only pending requests can be edited or cancelled. Reload to see the current status.");
  } catch { return fail(res, 500, "Unable to save support request. Please try again."); }
}
exports.update = (req, res) => mutate(req, res, false);
exports.cancel = (req, res) => mutate(req, res, true);
