const {
  Booking,
  Complaint,
  Provider,
  BookingAssignment,
  AdminActivityLog,
  User,
} = require("../../models");
const send = (res, data, message = "Success") =>
  res.json({ success: true, data, message });
const activeStatuses = ["assigned", "en_route", "arrived", "in_progress"];

exports.dashboard = async (req, res, next) => {
  try {
    const [
      totalBookings,
      pending,
      ongoing,
      completed,
      complaints,
      availableProviders,
      recentActivity,
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: "pending" }),
      Booking.countDocuments({ status: { $in: activeStatuses } }),
      Booking.countDocuments({ status: "completed" }),
      Complaint.countDocuments({ status: { $in: ["open", "investigating"] } }),
      Provider.countDocuments({ status: "active", isAvailable: true }),
      AdminActivityLog.find()
        .populate("actor", "fullName email")
        .sort({ createdAt: -1 })
        .limit(10),
    ]);
    return send(res, {
      totalBookings,
      pending,
      ongoing,
      completed,
      complaints,
      availableProviders,
      recentActivity,
    });
  } catch (error) {
    return next(error);
  }
};
exports.bookings = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.status && req.query.status !== "all")
      query.status = req.query.status;
    if (req.query.search)
      query.$or = [
        { bookingRef: new RegExp(req.query.search, "i") },
        { addressSnapshot: new RegExp(req.query.search, "i") },
      ];
    const bookings = await Booking.find(query)
      .populate("customer", "fullName email phone")
      .populate("provider", "city ratingAvg")
      .populate("service", "name")
      .sort({ createdAt: -1 })
      .limit(100);
    return send(res, bookings);
  } catch (error) {
    return next(error);
  }
};
exports.availableProviders = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking)
      return res
        .status(404)
        .json({ success: false, data: null, message: "Booking not found" });
    const providers = await Provider.find({
      status: "active",
      isAvailable: true,
      ...(req.query.city ? { city: new RegExp(req.query.city, "i") } : {}),
    })
      .populate("user", "fullName email phone")
      .populate("services.service", "name");
    return send(res, providers);
  } catch (error) {
    return next(error);
  }
};
exports.assignProvider = async (req, res, next) => {
  try {
    const [booking, provider] = await Promise.all([
      Booking.findById(req.params.id),
      Provider.findOne({
        _id: req.body.providerId,
        status: "active",
        isAvailable: true,
      }),
    ]);
    if (!booking)
      return res
        .status(404)
        .json({ success: false, data: null, message: "Booking not found" });
    if (!provider)
      return res
        .status(422)
        .json({
          success: false,
          data: null,
          message: "Provider is not active, available, or does not exist",
        });
    booking.provider = provider._id;
    booking.status = "assigned";
    booking.statusHistory.push({
      status: "assigned",
      changedBy: req.user._id,
      note: "Provider assigned by admin",
    });
    await booking.save();
    await BookingAssignment.findOneAndUpdate(
      { booking: booking._id },
      {
        booking: booking._id,
        provider: provider._id,
        assignedBy: req.user._id,
        response: "pending",
      },
      { upsert: true, new: true },
    );
    await AdminActivityLog.create({
      actor: req.user._id,
      action: "provider_assigned",
      entityType: "Booking",
      entityId: booking._id.toString(),
    });
    return send(
      res,
      await Booking.findById(booking._id).populate("customer provider service"),
      "Provider assigned",
    );
  } catch (error) {
    return next(error);
  }
};
exports.jobs = async (req, res, next) => {
  try {
    const query = { status: { $in: activeStatuses } };
    if (req.query.status && req.query.status !== "all")
      query.status = req.query.status;
    if (req.query.search)
      query.$or = [
        { bookingRef: new RegExp(req.query.search, "i") },
        { addressSnapshot: new RegExp(req.query.search, "i") },
      ];
    return send(
      res,
      await Booking.find(query)
        .populate("customer", "fullName")
        .populate("provider", "user city")
        .populate("service", "name")
        .sort({ scheduledDate: 1 }),
    );
  } catch (error) {
    return next(error);
  }
};
exports.updateJobStatus = async (req, res, next) => {
  try {
    const allowed = [
      "assigned",
      "en_route",
      "arrived",
      "in_progress",
      "completed",
      "cancelled",
    ];
    if (!allowed.includes(req.body.status))
      return res
        .status(422)
        .json({ success: false, data: null, message: "Invalid job status" });
    const booking = await Booking.findById(req.params.id);
    if (!booking)
      return res
        .status(404)
        .json({ success: false, data: null, message: "Booking not found" });
    booking.status = req.body.status;
    booking.etaMinutes = req.body.etaMinutes;
    booking.statusHistory.push({
      status: req.body.status,
      changedBy: req.user._id,
      note: req.body.note,
    });
    await booking.save();
    await AdminActivityLog.create({
      actor: req.user._id,
      action: `job_status_${req.body.status}`,
      entityType: "Booking",
      entityId: booking._id.toString(),
    });
    return send(res, booking, "Job status updated");
  } catch (error) {
    return next(error);
  }
};
exports.users = async (req, res, next) => {
  try {
    return send(
      res,
      await User.find().select("-passwordHash").sort({ createdAt: -1 }),
    );
  } catch (error) {
    return next(error);
  }
};
