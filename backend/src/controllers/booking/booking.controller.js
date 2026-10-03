const crypto = require("crypto");
const { Booking, Service, Provider, Payment, User } = require("../../models");

const send = (res, data, message = "Success", status = 200) =>
  res.status(status).json({ success: true, data, message });

const fail = (res, message, status = 400, data = null) =>
  res.status(status).json({ success: false, data, message });

const activeStatuses = [
  "pending",
  "confirmed",
  "assigned",
  "en_route",
  "arrived",
  "in_progress",
];

const generateBookingRef = () => {
  const dateStr = Date.now().toString(36).toUpperCase();
  const randStr = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `BK-${dateStr.slice(-4)}${randStr}`;
};

// Create a new booking
exports.create = async (req, res, next) => {
  try {
    const {
      serviceId,
      scheduledDate,
      timePeriod,
      scheduledTime,
      addressSnapshot,
      notes,
      paymentMode = "pay_on_completion",
    } = req.body;

    if (!serviceId) {
      return fail(res, "Service ID is required");
    }
    if (!scheduledDate) {
      return fail(res, "Scheduled date is required");
    }
    if (!addressSnapshot || !addressSnapshot.trim()) {
      return fail(res, "Service address is required");
    }

    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      return fail(res, "Selected service is no longer available", 404);
    }

    const bookingDate = new Date(scheduledDate);
    if (isNaN(bookingDate.getTime())) {
      return fail(res, "Invalid scheduled date");
    }

    // Ensure scheduled date is not before today (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(bookingDate);
    checkDate.setHours(0, 0, 0, 0);
    if (checkDate < today) {
      return fail(res, "Scheduled date cannot be in the past");
    }

    const validPeriods = ["morning", "afternoon", "evening"];
    const period = validPeriods.includes(timePeriod) ? timePeriod : "morning";

    const basePrice = Number(service.basePrice) || 0;
    const bookingCharge = 350; // standard booking/platform fee
    const tax = Math.round(basePrice * 0.05); // 5% tax
    const totalPrice = basePrice + bookingCharge + tax;

    let bookingRef = generateBookingRef();
    // Ensure uniqueness
    let existingRef = await Booking.findOne({ bookingRef });
    while (existingRef) {
      bookingRef = generateBookingRef();
      existingRef = await Booking.findOne({ bookingRef });
    }

    const booking = await Booking.create({
      bookingRef,
      customer: req.user._id,
      service: service._id,
      addressSnapshot: addressSnapshot.trim(),
      scheduledDate: bookingDate,
      timePeriod: period,
      scheduledTime: scheduledTime || (period === "morning" ? "09:00 AM" : period === "afternoon" ? "02:00 PM" : "06:00 PM"),
      durationHours: service.estDurationHours || "1-2 hours",
      serviceFee: basePrice,
      bookingCharge,
      tax,
      totalPrice,
      paymentMode: paymentMode === "pay_now" ? "pay_now" : "pay_on_completion",
      status: "pending",
      notes: notes ? notes.trim() : "",
      statusHistory: [
        {
          status: "pending",
          changedBy: req.user._id,
          note: "Booking submitted by customer",
          at: new Date(),
        },
      ],
    });

    const populated = await Booking.findById(booking._id)
      .populate("service")
      .populate("customer", "fullName email phone avatarUrl");

    return send(res, populated, "Booking scheduled successfully", 201);
  } catch (error) {
    return next(error);
  }
};

// List bookings for current user (customer or provider)
exports.list = async (req, res, next) => {
  try {
    const { status, filter, search } = req.query;
    const query = {};

    if (req.user.role === "customer") {
      query.customer = req.user._id;
    } else if (req.user.role === "provider") {
      const providerProfile = await Provider.findOne({ user: req.user._id });
      if (!providerProfile) {
        return send(res, []);
      }
      query.provider = providerProfile._id;
    } else if (req.user.role !== "admin") {
      query.customer = req.user._id;
    }

    if (filter === "upcoming" || filter === "active") {
      query.status = { $in: activeStatuses };
    } else if (filter === "completed") {
      query.status = "completed";
    } else if (filter === "cancelled") {
      query.status = "cancelled";
    } else if (status && status !== "all") {
      query.status = status;
    }

    if (search && search.trim()) {
      query.$or = [
        { bookingRef: new RegExp(search.trim(), "i") },
        { addressSnapshot: new RegExp(search.trim(), "i") },
      ];
    }

    const bookings = await Booking.find(query)
      .populate("service")
      .populate({
        path: "provider",
        populate: { path: "user", select: "fullName phone email avatarUrl" },
      })
      .sort({ scheduledDate: -1, createdAt: -1 });

    return send(res, bookings);
  } catch (error) {
    return next(error);
  }
};

// Get single booking by ID
exports.getById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("service")
      .populate("customer", "fullName email phone avatarUrl")
      .populate({
        path: "provider",
        populate: { path: "user", select: "fullName phone email avatarUrl" },
      })
      .populate("statusHistory.changedBy", "fullName role");

    if (!booking) {
      return fail(res, "Booking not found", 404);
    }

    // Authorization check
    const isCustomer = booking.customer?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    let isAssignedProvider = false;
    if (req.user.role === "provider" && booking.provider) {
      const providerProfile = await Provider.findOne({ user: req.user._id });
      if (providerProfile && booking.provider._id?.toString() === providerProfile._id.toString()) {
        isAssignedProvider = true;
      }
    }

    if (!isCustomer && !isAdmin && !isAssignedProvider) {
      return fail(res, "You do not have permission to view this booking", 403);
    }

    // Also fetch associated payment record if exists
    const payment = await Payment.findOne({ booking: booking._id }).populate("paymentMethod");

    return send(res, { booking, payment });
  } catch (error) {
    return next(error);
  }
};

// Reschedule booking
exports.reschedule = async (req, res, next) => {
  try {
    const { scheduledDate, timePeriod, scheduledTime, notes } = req.body;

    if (!scheduledDate) {
      return fail(res, "New scheduled date is required");
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return fail(res, "Booking not found", 404);
    }

    // Permission check
    const isCustomer = booking.customer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isCustomer && !isAdmin) {
      return fail(res, "You do not have permission to reschedule this booking", 403);
    }

    // Check if status allows rescheduling
    const allowableStatuses = ["pending", "confirmed", "assigned"];
    if (!allowableStatuses.includes(booking.status)) {
      return fail(
        res,
        `Cannot reschedule booking in '${booking.status.replace("_", " ")}' status`,
      );
    }

    const newDate = new Date(scheduledDate);
    if (isNaN(newDate.getTime())) {
      return fail(res, "Invalid date format");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(newDate);
    checkDate.setHours(0, 0, 0, 0);
    if (checkDate < today) {
      return fail(res, "New scheduled date cannot be in the past");
    }

    const validPeriods = ["morning", "afternoon", "evening"];
    const period = validPeriods.includes(timePeriod) ? timePeriod : booking.timePeriod;
    const time = scheduledTime || booking.scheduledTime;

    const previousDateStr = booking.scheduledDate
      ? new Date(booking.scheduledDate).toLocaleDateString()
      : "pending date";
    const newDateStr = newDate.toLocaleDateString();

    booking.scheduledDate = newDate;
    booking.timePeriod = period;
    booking.scheduledTime = time;
    if (notes) {
      booking.notes = notes.trim();
    }

    booking.statusHistory.push({
      status: booking.status,
      changedBy: req.user._id,
      note: `Rescheduled from ${previousDateStr} to ${newDateStr} (${time})`,
      at: new Date(),
    });

    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate("service")
      .populate({
        path: "provider",
        populate: { path: "user", select: "fullName phone email avatarUrl" },
      });

    return send(res, updated, "Booking rescheduled successfully");
  } catch (error) {
    return next(error);
  }
};

// Cancel booking
exports.cancel = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return fail(res, "Booking not found", 404);
    }

    // Permission check
    const isCustomer = booking.customer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isCustomer && !isAdmin) {
      return fail(res, "You do not have permission to cancel this booking", 403);
    }

    if (booking.status === "completed") {
      return fail(res, "Completed bookings cannot be cancelled");
    }
    if (booking.status === "cancelled") {
      return fail(res, "Booking is already cancelled");
    }

    const cancellationReason = reason && reason.trim() ? reason.trim() : "Cancelled by customer";

    booking.status = "cancelled";
    booking.cancelledReason = cancellationReason;
    booking.statusHistory.push({
      status: "cancelled",
      changedBy: req.user._id,
      note: cancellationReason,
      at: new Date(),
    });

    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate("service")
      .populate({
        path: "provider",
        populate: { path: "user", select: "fullName phone email avatarUrl" },
      });

    return send(res, updated, "Booking cancelled successfully");
  } catch (error) {
    return next(error);
  }
};

// Provider / Admin status update (e.g. en_route, arrived, in_progress, completed)
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, etaMinutes, note } = req.body;

    if (!status) {
      return fail(res, "Status is required");
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return fail(res, "Booking not found", 404);
    }

    const isAdmin = req.user.role === "admin";
    let isProvider = false;
    if (req.user.role === "provider" && booking.provider) {
      const providerProfile = await Provider.findOne({ user: req.user._id });
      if (providerProfile && booking.provider.toString() === providerProfile._id.toString()) {
        isProvider = true;
      }
    }

    if (!isAdmin && !isProvider) {
      return fail(res, "You do not have permission to update this booking status", 403);
    }

    booking.status = status;
    if (etaMinutes !== undefined) {
      booking.etaMinutes = Number(etaMinutes);
    }

    booking.statusHistory.push({
      status,
      changedBy: req.user._id,
      note: note || `Status changed to ${status.replace("_", " ")}`,
      at: new Date(),
    });

    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate("service")
      .populate("customer", "fullName phone email")
      .populate({
        path: "provider",
        populate: { path: "user", select: "fullName phone email avatarUrl" },
      });

    return send(res, updated, `Status updated to ${status.replace("_", " ")}`);
  } catch (error) {
    return next(error);
  }
};

// Get available slots helper
exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    const slots = [
      { id: "morning", period: "morning", label: "Morning", timeRange: "08:00 AM - 12:00 PM", defaultTime: "09:00 AM", available: true },
      { id: "afternoon", period: "afternoon", label: "Afternoon", timeRange: "12:00 PM - 04:00 PM", defaultTime: "02:00 PM", available: true },
      { id: "evening", period: "evening", label: "Evening", timeRange: "04:00 PM - 08:00 PM", defaultTime: "06:00 PM", available: true },
    ];

    return send(res, { date: targetDate.toISOString().split("T")[0], slots });
  } catch (error) {
    return next(error);
  }
};
