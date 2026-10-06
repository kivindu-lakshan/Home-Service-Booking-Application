const { SupportTicket, User } = require("../../models");
const { ok, fail } = require("../../utils/response");

exports.list = async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .sort({ createdAt: -1, _id: -1 })
      .populate("user", "fullName email")
      .lean();

    const data = tickets.map((t) => ({
      _id: t._id,
      category: t.category,
      subject: t.subject,
      description: t.description,
      status: t.status,
      adminResponse: t.adminResponse,
      respondedAt: t.respondedAt,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      customer: t.user
        ? { fullName: t.user.fullName, email: t.user.email }
        : null,
    }));
    return ok(res, data);
  } catch {
    return fail(res, 500, "Unable to load support tickets. Please try again.");
  }
};

exports.respond = async (req, res) => {
  try {
    const { adminResponse, status } = req.body || {};
    const allowedStatuses = ["pending", "in_progress", "resolved"];
    if (status && !allowedStatuses.includes(status))
      return fail(res, 400, "Invalid status value.");

    const update = {};
    if (typeof adminResponse === "string") {
      update.adminResponse = adminResponse.trim();
      update.respondedAt = adminResponse.trim() ? new Date() : null;
    }
    if (status) update.status = status;

    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true },
    ).populate("user", "fullName email");

    if (!ticket) return fail(res, 404, "Support ticket not found.");
    return ok(res, {
      _id: ticket._id,
      category: ticket.category,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      adminResponse: ticket.adminResponse,
      respondedAt: ticket.respondedAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      customer: ticket.user
        ? { fullName: ticket.user.fullName, email: ticket.user.email }
        : null,
    }, "Ticket updated.");
  } catch {
    return fail(res, 500, "Unable to update ticket. Please try again.");
  }
};
