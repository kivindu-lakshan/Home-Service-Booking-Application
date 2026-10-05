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

exports.listCustomerBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ customer: req.user._id })
      .populate("service provider")
      .sort({ scheduledDate: -1 });
    return send(res, bookings);
  } catch (error) {
    return next(error);
  }
};

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
    if (
      !["card", "demo_card", "cash_on_arrival", "cash_on_completion"].includes(
        method,
      )
    )
      return res.status(422).json({
        success: false,
        data: null,
        message: "Invalid payment method",
      });
<<<<<<< HEAD
    if (method === "card") {
      const paymentMethod = await PaymentMethod.findOne({
        _id: req.body.paymentMethodId,
        user: req.user._id,
      });
=======
    let paymentMethod;
    if (method === "demo_card") {
      const { cardholderName, cardNumber, expiryDate, cvv } =
        req.body.card || {};
      if (
        !cardholderName?.trim() ||
        !/^\d{16}$/.test(cardNumber || "") ||
        !/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate || "") ||
        !/^\d{3,4}$/.test(cvv || "")
      )
        return res.status(422).json({
          success: false,
          data: null,
          message:
            "Enter the demo card number, expiry date, CVV, and cardholder name",
        });
      paymentMethod = await PaymentMethod.findOneAndUpdate(
        { user: req.user._id, gatewayToken: "university_demo_card" },
        {
          user: req.user._id,
          type: "card",
          brand: "Demo Visa",
          last4: "4242",
          gatewayToken: "university_demo_card",
          isDefault: false,
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
    } else if (method === "card") {
      if (req.body.card) {
        const { cardholderName, cardNumber, expiryDate, cvv } = req.body.card;
        if (
          !cardholderName?.trim() ||
          !/^\d{16}$/.test(cardNumber || "") ||
          !/^(0[1-9]|1[0-2])\/(\d{2})$/.test(expiryDate || "") ||
          !/^\d{3,4}$/.test(cvv || "")
        )
          return res.status(422).json({
            success: false,
            data: null,
            message:
              "Enter a cardholder name, a 16-digit card number, a valid MM/YY expiry, and a 3 or 4 digit CVV",
          });
        const [month, year] = expiryDate.split("/").map(Number);
        const expiry = new Date(2000 + year, month, 0, 23, 59, 59);
        if (expiry < new Date())
          return res.status(422).json({
            success: false,
            data: null,
            message: "The card expiry date has passed",
          });
        paymentMethod = await PaymentMethod.create({
          user: req.user._id,
          type: "card",
          brand: "Card",
          last4: cardNumber.slice(-4),
          gatewayToken: `sim_${crypto.randomBytes(16).toString("hex")}`,
          isDefault: false,
        });
      } else {
        paymentMethod = await PaymentMethod.findOne({
          _id: req.body.paymentMethodId,
          user: req.user._id,
        });
      }
>>>>>>> origin/origin-02/feature/payment,review,admin
      if (!paymentMethod)
        return res.status(422).json({
          success: false,
          data: null,
          message: "Select a saved payment method",
        });
    }
    const paid = method === "card" || method === "demo_card";
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
