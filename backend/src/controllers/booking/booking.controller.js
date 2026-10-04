const crypto = require("crypto");
const {
  Booking,
  Service,
  Provider,
  User,
  ProviderApplication,
  Payment,
} = require("../../models");
const { activeService, validId } = require("../catalogue/catalogue.controller");
const { ok } = require("../../utils/response");
const fail = (res, first, second = 400, data = null) => {
  const status = typeof first === "number" ? first : second;
  const message = typeof first === "number" ? second : first;
  return res.status(status).json({ success: false, data, message });
};
exports.create = async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.providerId && body.addressSnapshot) {
      if (!validId(body.serviceId)) return fail(res, 400, "Service ID is required");
      if (typeof body.scheduledDate !== "string")
        return fail(res, 400, "Scheduled date is required");
      const service = await Service.findOne({ _id: body.serviceId, isActive: true });
      if (!service) return fail(res, 404, "Selected service is no longer available");
      const bookingDate = new Date(body.scheduledDate);
      if (!Number.isFinite(bookingDate.getTime())) return fail(res, 400, "Invalid scheduled date");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateOnly = new Date(bookingDate);
      dateOnly.setHours(0, 0, 0, 0);
      if (dateOnly < today) return fail(res, 400, "Scheduled date cannot be in the past");
      const timePeriod = ["morning", "afternoon", "evening"].includes(body.timePeriod) ? body.timePeriod : "morning";
      const basePrice = Number(service.basePrice) || 0;
      const booking = await Booking.create({
        bookingRef: `BK-${crypto.randomUUID().toUpperCase()}`,
        customer: req.user._id,
        service: service._id,
        addressSnapshot: body.addressSnapshot.trim(),
        scheduledDate: bookingDate,
        timePeriod,
        scheduledTime: body.scheduledTime || (timePeriod === "morning" ? "09:00 AM" : timePeriod === "afternoon" ? "02:00 PM" : "06:00 PM"),
        durationHours: service.estDurationHours || "1-2 hours",
        serviceFee: basePrice,
        bookingCharge: 350,
        tax: Math.round(basePrice * 0.05),
        totalPrice: basePrice + 350 + Math.round(basePrice * 0.05),
        paymentMode: body.paymentMode === "pay_now" ? "pay_now" : "pay_on_completion",
        status: "pending",
        notes: typeof body.notes === "string" ? body.notes.trim() : "",
        statusHistory: [{ status: "pending", changedBy: req.user._id, note: "Booking submitted by customer" }],
      });
      const populated = await Booking.findById(booking._id).populate("service").populate("customer", "fullName email phone avatarUrl");
      return res.status(201).json({ success: true, data: populated, message: "Booking scheduled successfully" });
    }
    const allowed = [
      "serviceId",
      "providerId",
      "addressId",
      "scheduledDate",
      "scheduledTime",
      "notes",
    ];
    if (Object.keys(body).some((k) => !allowed.includes(k)))
      return fail(res, 400, "Unsupported booking fields");
    if (![body.serviceId, body.providerId, body.addressId].every(validId))
      return fail(res, 400, "Select a service, provider and saved address");
    if (
      typeof body.scheduledDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body.scheduledDate) ||
      typeof body.scheduledTime !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.scheduledTime)
    )
      return fail(res, 400, "Use a valid date and 24-hour time");
    const day = new Date(`${body.scheduledDate}T00:00:00+05:30`);
    const appointment = new Date(
      `${body.scheduledDate}T${body.scheduledTime}:00+05:30`,
    );
    if (
      !Number.isFinite(appointment.getTime()) ||
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Colombo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(day) !== body.scheduledDate ||
      appointment <= new Date()
    )
      return fail(res, 400, "Choose a future appointment date and time");
    if (
      body.notes !== undefined &&
      (typeof body.notes !== "string" || body.notes.length > 2000)
    )
      return fail(res, 400, "Notes must be under 2000 characters");
    const [service, provider] = await Promise.all([
      activeService(body.serviceId),
      Provider.findOne({
        _id: body.providerId,
        status: "active",
        isAvailable: { $ne: false },
        "services.service": body.serviceId,
      }).lean(),
    ]);
    if (
      !(await ProviderApplication.exists({
        provider: body.providerId,
        service: body.serviceId,
        status: "approved",
      }))
    )
      return fail(
        res,
        409,
        "This provider is not approved for the selected service",
      );
    if (
      !service ||
      !provider ||
      !(await User.exists({ _id: provider.user, status: "active" }))
    )
      return fail(
        res,
        409,
        "The selected provider or service is no longer available",
      );
    const address = req.user.addresses?.find(
      (a) => String(a._id) === body.addressId,
    );
    if (!address || !address.line1)
      return fail(res, 400, "Choose one of your saved addresses");
    const weekday = new Date(`${body.scheduledDate}T00:00:00Z`).getUTCDay();
    if (
      provider.availability?.length &&
      !provider.availability.some(
        (a) =>
          a.dayOfWeek === weekday &&
          a.isAvailable &&
          a.startTime <= body.scheduledTime &&
          a.endTime > body.scheduledTime,
      )
    )
      return fail(res, 409, "The provider is unavailable at this time");
    const offering = provider.services.find(
      (s) => String(s.service) === body.serviceId,
    );
    const price = offering.priceFrom ?? service.basePrice;
    if (!Number.isFinite(price) || price < 0)
      return fail(
        res,
        409,
        "This provider has no booking price. Please contact support.",
      );
    const hours = Number(body.scheduledTime.slice(0, 2));
    // Preserve the stored time convention so the existing unique slot index also protects seeded bookings.
    const scheduledTime = `${String(hours % 12 || 12).padStart(2, "0")}:${body.scheduledTime.slice(3)} ${hours < 12 ? "AM" : "PM"}`;
    const booking = await Booking.create({
      bookingRef: `BK-${crypto.randomUUID().toUpperCase()}`,
      customer: req.user._id,
      provider: provider._id,
      service: service._id,
      addressSnapshot: [address.line1, address.areaCity, address.landmark]
        .filter(Boolean)
        .join(", "),
      scheduledDate: day,
      scheduledTime,
      timePeriod: hours < 12 ? "morning" : hours < 17 ? "afternoon" : "evening",
      durationHours: service.estDurationHours,
      serviceFee: price,
      totalPrice: price,
      paymentMode: "pay_on_completion",
      notes: body.notes?.trim(),
      status: "pending",
      statusHistory: [{ status: "pending", changedBy: req.user._id }],
    });
    return res
      .status(201)
      .json({ success: true, data: booking, message: "Booking requested" });
  } catch (e) {
    if (e.code === 11000)
      return fail(
        res,
        409,
        "This appointment time has already been booked. Choose another time.",
      );
    next(e);
  }
};
exports.details = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, "Invalid booking ID");
    const booking = await Booking.findOne({
      _id: req.params.id,
      customer: req.user._id,
    }).populate("service provider");
    return booking ? ok(res, booking) : fail(res, 404, "Booking not found");
  } catch (e) {
    next(e);
  }
};

const send = (res, data, message = "Success", status = 200) =>
  res.status(status).json({ success: true, data, message });

const activeStatuses = [
  "pending",
  "confirmed",
  "assigned",
  "en_route",
  "arrived",
  "in_progress",
];

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
