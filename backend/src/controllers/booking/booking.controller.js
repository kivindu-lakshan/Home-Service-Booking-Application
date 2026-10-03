const { randomBytes } = require("node:crypto");
const { Booking, Provider, Service } = require("../../models");

const send = (res, data, message = "Success") =>
  res.json({ success: true, data, message });

const periods = ["morning", "afternoon", "evening"];
const isDateOnly = (value) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

exports.create = async (req, res, next) => {
  try {
    const { serviceId, providerId, scheduledDate, timePeriod, scheduledTime } =
      req.body;
    if (
      !serviceId ||
      !providerId ||
      !isDateOnly(scheduledDate) ||
      !periods.includes(timePeriod) ||
      typeof scheduledTime !== "string" ||
      !scheduledTime.trim()
    )
      return res
        .status(422)
        .json({
          success: false,
          data: null,
          message: "Choose a provider, date, time period, and time.",
        });
    const date = new Date(`${scheduledDate}T00:00:00.000Z`);
    if (
      Number.isNaN(date.getTime()) ||
      date < new Date(new Date().toISOString().slice(0, 10))
    )
      return res
        .status(422)
        .json({
          success: false,
          data: null,
          message: "Choose a date from today onward.",
        });
    const [service, provider] = await Promise.all([
      Service.findOne({ _id: serviceId, isActive: true }),
      Provider.findOne({
        _id: providerId,
        status: "active",
        isAvailable: true,
        "services.service": serviceId,
      }),
    ]);
    if (!service || !provider)
      return res
        .status(404)
        .json({
          success: false,
          data: null,
          message: "That service provider is no longer available.",
        });
    const serviceFee = Number(service.basePrice || 0);
    const booking = await Booking.create({
      bookingRef: `BK-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`,
      customer: req.user._id,
      provider: provider._id,
      service: service._id,
      addressSnapshot: "Customer address to be confirmed",
      scheduledDate: date,
      timePeriod,
      scheduledTime: scheduledTime.trim(),
      durationHours: service.estDurationHours,
      serviceFee,
      bookingCharge: 0,
      tax: 0,
      totalPrice: serviceFee,
      paymentMode: "pay_now",
      status: "pending",
      statusHistory: [{ status: "pending", changedBy: req.user._id }],
    });
    return send(
      res,
      await Booking.findById(booking._id).populate("service provider"),
      "Booking created",
    );
  } catch (error) {
    return next(error);
  }
};
