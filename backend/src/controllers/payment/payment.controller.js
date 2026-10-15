const crypto = require("crypto");
const { Booking, Payment, PaymentMethod } = require("../../models");

const send = (res, data, message = "Success") =>
  res.json({ success: true, data, message });

const receiptNumber = () =>
  `RC-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;

async function ownedBooking(req, bookingId) {
  return Booking.findOne({
    _id: bookingId,
    customer: req.user._id,
  }).populate("service provider");
}

exports.listCustomerBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({
      customer: req.user._id,
    })
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

    if (!booking) {
      return res.status(404).json({
        success: false,
        data: null,
        message: "Booking not found",
      });
    }

    const payment = await Payment.findOne({
      booking: booking._id,
    }).populate("paymentMethod");

    return send(res, { booking, payment });
  } catch (error) {
    return next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const booking = await ownedBooking(req, req.params.bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        data: null,
        message: "Booking not found",
      });
    }

    if (booking.status === "cancelled") {
      return res.status(409).json({
        success: false,
        data: null,
        message: "Cancelled bookings cannot be paid",
      });
    }

    const method =
      req.body.method ||
      (req.body.paymentMethodId ? "card" : "cash_on_completion");

    if (
      ![
        "card",
        "demo_card",
        "cash_on_arrival",
        "cash_on_completion",
      ].includes(method)
    ) {
      return res.status(422).json({
        success: false,
        data: null,
        message: "Invalid payment method",
      });
    }

    let paymentMethod;

    /*
     * DEMO CARD VALIDATION
     *
     * Accepts:
     * - Any non-empty cardholder name
     * - Any 16-digit card number
     * - Expiry in MM/YY format, at least one month ahead
     * - Any 3- or 4-digit CVV
     *
     * Raw card numbers and CVVs are never stored in the database.
     */
    if (method === "demo_card" || (method === "card" && req.body.card)) {
      const {
        cardholderName,
        cardNumber,
        expiryDate,
        cvv,
      } = req.body.card || {};

      if (
        typeof cardholderName !== "string" ||
        !cardholderName.trim() ||
        !/^\d{16}$/.test(cardNumber || "") ||
        !/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate || "") ||
        !/^\d{3,4}$/.test(cvv || "")
      ) {
        return res.status(422).json({
          success: false,
          data: null,
          message:
            "Enter a name, a 16-digit card number, a valid MM/YY expiry date, and a 3 or 4 digit CVV",
        });
      }

      const [month, year] = expiryDate.split("/").map(Number);

      const expiryEnd = new Date(
        2000 + year,
        month,
        0,
        23,
        59,
        59,
        999,
      );

      const minimumExpiry = new Date();
      minimumExpiry.setMonth(minimumExpiry.getMonth() + 1);
      minimumExpiry.setDate(1);
      minimumExpiry.setHours(0, 0, 0, 0);

      if (expiryEnd < minimumExpiry) {
        return res.status(422).json({
          success: false,
          data: null,
          message:
            "The expiry date must be at least one month ahead of the current date.",
        });
      }

      // Store only safe demo metadata, never the full card number or CVV.
      paymentMethod = await PaymentMethod.create({
        user: req.user._id,
        type: "card",
        brand: "Demo Card",
        last4: cardNumber.slice(-4),
        gatewayToken: `sim_${crypto.randomBytes(16).toString("hex")}`,
        isDefault: false,
      });
    } else if (method === "card") {
      paymentMethod = await PaymentMethod.findOne({
        _id: req.body.paymentMethodId,
        user: req.user._id,
      });

      if (!paymentMethod) {
        return res.status(422).json({
          success: false,
          data: null,
          message: "Select a saved payment method",
        });
      }
    }

    const paid = method === "card" || method === "demo_card";

    // Refund protection is available only for prepaid card bookings.
    const wantsProtection =
      Boolean(req.body.refundProtection) && paid;

    const baseServiceAmount = Number(booking.totalPrice) || 0;

    const protectionFee = wantsProtection
      ? Math.round(baseServiceAmount * 0.1 * 100) / 100
      : 0;

    const totalAmount = baseServiceAmount + protectionFee;

    const payment = await Payment.findOneAndUpdate(
      { booking: booking._id },
      {
        booking: booking._id,
        paymentMethod: paymentMethod?._id,
        // The Payment model uses "card", not "demo_card".
        method: paid ? "card" : method,
        amount: baseServiceAmount,
        refundProtection: wantsProtection,
        refundProtectionFee: protectionFee,
        protectedServiceAmount: baseServiceAmount,
        totalAmount,
        status: paid ? "paid" : "pending",
        receiptNo: paid ? receiptNumber() : undefined,
        paidAt: paid ? new Date() : undefined,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    ).populate("paymentMethod");

    await Booking.findByIdAndUpdate(booking._id, {
      paymentMode: paid ? "pay_now" : "pay_on_completion",
    });

    return send(
      res,
      { payment, booking },
      paid ? "Demo payment recorded" : "Pay-on-completion selected",
    );
  } catch (error) {
    return next(error);
  }
};

exports.listMethods = async (req, res, next) => {
  try {
    return send(
      res,
      await PaymentMethod.find({
        user: req.user._id,
      }).sort({
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
    const {
      type,
      brand,
      last4,
      gatewayToken,
      isDefault,
    } = req.body;

    if (type === "card" && (!last4 || !/^\d{4}$/.test(last4))) {
      return res.status(422).json({
        success: false,
        data: null,
        message: "Only a valid four-digit last4 value may be stored",
      });
    }

    if (isDefault) {
      await PaymentMethod.updateMany(
        { user: req.user._id },
        { isDefault: false },
      );
    }

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
    await PaymentMethod.deleteOne({
      _id: req.params.id,
      user: req.user._id,
    });

    return send(res, null, "Payment method removed");
  } catch (error) {
    return next(error);
  }
};