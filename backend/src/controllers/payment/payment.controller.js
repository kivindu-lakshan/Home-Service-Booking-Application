const crypto = require("crypto");
const { Booking, Payment, PaymentMethod } = require("../../models");

const send = (res, data, message = "Success") =>
  res.json({ success: true, data, message });
const receiptNumber = () =>
  `RC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

async function ownedBooking(req, bookingId) {
  return Booking.findOne({ _id: bookingId, customer: req.user._id }).populate(
    "service provider",
  );
}

exports.getByBooking = async (req, res, next) => {
  try {
    const booking = await ownedBooking(req, req.params.bookingId);
    if (!booking)
      return res
        .status(404)
        .json({ success: false, data: null, message: "Booking not found" });
    const payment = await Payment.findOne({ booking: booking._id }).populate(
      "paymentMethod",
    );
    return send(res, { booking, payment });
  } catch (error) {
    return next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const booking = await ownedBooking(req, req.params.bookingId);
    if (!booking)
      return res
        .status(404)
        .json({ success: false, data: null, message: "Booking not found" });
    if (booking.status === "cancelled")
      return res.status(409).json({
        success: false,
        data: null,
        message: "Cancelled bookings cannot be paid",
      });
    const method =
      req.body.method ||
      (req.body.paymentMethodId ? "card" : "cash_on_completion");
    if (!["card", "cash_on_arrival", "cash_on_completion"].includes(method))
      return res.status(422).json({
        success: false,
        data: null,
        message: "Invalid payment method",
      });
    if (method === "card") {
      const paymentMethod = await PaymentMethod.findOne({
        _id: req.body.paymentMethodId,
        user: req.user._id,
      });
      if (!paymentMethod)
        return res.status(422).json({
          success: false,
          data: null,
          message: "Select a saved payment method",
        });
    }
    const paid = method === "card";
    const payment = await Payment.findOneAndUpdate(
      { booking: booking._id },
      {
        booking: booking._id,
        paymentMethod: req.body.paymentMethodId || undefined,
        method,
        amount: booking.totalPrice,
        status: paid ? "paid" : "pending",
        receiptNo: paid ? receiptNumber() : undefined,
        paidAt: paid ? new Date() : undefined,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).populate("paymentMethod");
    return send(
      res,
      { payment, booking },
      paid ? "Payment recorded" : "Pay-on-completion selected",
    );
  } catch (error) {
    return next(error);
  }
};

exports.listMethods = async (req, res, next) => {
  try {
    return send(
      res,
      await PaymentMethod.find({ user: req.user._id }).sort({
        isDefault: -1,
        createdAt: -1,
      }),
    );
  } catch (error) {
    return next(error);
  }
};
exports.createMethod = async (req, res, next) => {
  try {
    const { type, brand, last4, gatewayToken, isDefault } = req.body;
    if (type === "card" && (!last4 || !/^\d{4}$/.test(last4)))
      return res.status(422).json({
        success: false,
        data: null,
        message: "Only a valid four-digit last4 value may be stored",
      });
    if (isDefault)
      await PaymentMethod.updateMany(
        { user: req.user._id },
        { isDefault: false },
      );
    return send(
      res,
      await PaymentMethod.create({
        user: req.user._id,
        type,
        brand,
        last4,
        gatewayToken,
        isDefault: Boolean(isDefault),
      }),
      "Payment method saved",
    );
  } catch (error) {
    return next(error);
  }
};
exports.deleteMethod = async (req, res, next) => {
  try {
    await PaymentMethod.deleteOne({ _id: req.params.id, user: req.user._id });
    return send(res, null, "Payment method removed");
  } catch (error) {
    return next(error);
  }
};
