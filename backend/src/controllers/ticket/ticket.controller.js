const { SupportTicket } = require("../../models");

const send = (res, data, message = "Success") =>
  res.json({ success: true, data, message });

exports.mine = async (req, res, next) => {
  try {
    return send(
      res,
      await SupportTicket.find({ user: req.user._id }).sort({ createdAt: -1 }),
    );
  } catch (error) {
    return next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    return send(
      res,
      await SupportTicket.create({
        user: req.user._id,
        category: req.body.category || "Other",
        subject: req.body.subject,
        description: req.body.message,
      }),
      "Ticket submitted",
    );
  } catch (error) {
    return next(error);
  }
};

exports.adminList = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find()
      .populate("user", "fullName email")
      .populate("respondedBy", "fullName")
      .sort({ createdAt: -1 });
    return send(
      res,
      tickets.map((ticket) => ({
        ...ticket.toObject(),
        customer: ticket.user,
        message: ticket.description,
      })),
    );
  } catch (error) {
    return next(error);
  }
};

exports.respond = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      {
        adminResponse: req.body.adminResponse,
        status: req.body.status || "in_progress",
        respondedAt: new Date(),
        respondedBy: req.user._id,
      },
      { new: true, runValidators: true },
    ).populate("user respondedBy", "fullName email");
    if (!ticket)
      return res
        .status(404)
        .json({ success: false, data: null, message: "Ticket not found" });
    return send(
      res,
      {
        ...ticket.toObject(),
        customer: ticket.user,
        message: ticket.description,
      },
      "Ticket response saved",
    );
  } catch (error) {
    return next(error);
  }
};

exports.removeResponse = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      {
        $unset: { adminResponse: 1, respondedAt: 1, respondedBy: 1 },
        status: "pending",
      },
      { new: true },
    );
    if (!ticket)
      return res
        .status(404)
        .json({ success: false, data: null, message: "Ticket not found" });
    return send(res, ticket, "Ticket response deleted");
  } catch (error) {
    return next(error);
  }
};
