/**
 * refund.controller.js
 *
 * Handles all Refund Protection and Refund Request logic.
 * Eligibility is always re-verified server-side; client state is never trusted.
 */
const mongoose = require("mongoose");
const { Booking, Payment, RefundRequest } = require("../../models");

const send = (res, data, message = "Success", code = 200) =>
  res.status(code).json({ success: true, data, message });

const fail = (res, message, code = 400) =>
  res.status(code).json({ success: false, data: null, message });

// ─── Helpers ────────────────────────────────────────────────────────────────

function arrivedEntry(booking) {
  return (booking.statusHistory || []).find((h) => h.status === "arrived") || null;
}

async function checkEligibility(booking, payment) {
  if (!booking || booking.status !== "cancelled")
    return { eligible: false, reason: "Booking has not been cancelled." };

  if (booking.paymentMode !== "pay_now")
    return { eligible: false, reason: "This booking was Pay on Completion, which is not eligible for a refund through this feature." };

  if (!payment)
    return { eligible: false, reason: "No payment record found for this booking." };

  if (!payment.refundProtection)
    return { eligible: false, reason: "Refund Protection was not purchased for this booking. A refund request cannot be submitted through this feature." };

  if (!["card", "demo_card", "card_saved"].includes(payment.method || ""))
    return { eligible: false, reason: "Only prepaid card payments are eligible for a refund through this feature." };

  if (payment.status === "refunded")
    return { eligible: false, reason: "This payment has already been refunded." };

  if (payment.status !== "paid")
    return { eligible: false, reason: "Payment was not successfully completed for this booking." };

  const arrived = arrivedEntry(booking);
  if (arrived) {
    const cancelledEntry = (booking.statusHistory || []).find((h) => h.status === "cancelled");
    const cancelledAt = cancelledEntry ? new Date(cancelledEntry.at) : null;
    const arrivedAt = new Date(arrived.at);
    if (!cancelledAt || cancelledAt >= arrivedAt)
      return { eligible: false, reason: "The service provider had already arrived before the booking was cancelled." };
  }

  return { eligible: true };
}

exports.checkEligibility = checkEligibility;

const paymentSummary = (payment) =>
  payment
    ? {
      amount: payment.amount,
      refundProtection: payment.refundProtection,
      refundProtectionFee: payment.refundProtectionFee,
      protectedServiceAmount: payment.protectedServiceAmount,
      totalAmount: payment.totalAmount,
      method: payment.method,
      status: payment.status,
    }
    : null;

// Accept the rejection reason under several common key names
const pickReason = (body = {}) => {
  const raw =
    body.reason ??
    body.rejectionReason ??
    body.rejection_reason ??
    body.note ??
    body.message ??
    "";
  return typeof raw === "string" ? raw.trim() : "";
};

// Standard population used for admin responses
const populateAdmin = (query) =>
  query
    .populate({ path: "booking", populate: ["service"] })
    .populate({ path: "customer", select: "fullName email phone" })
    .populate({ path: "reviewedBy", select: "fullName" });

/**
 * GET /api/refunds/eligibility-summary
 */
exports.eligibilitySummary = async (req, res, next) => {
  try {
    const cancelled = await Booking.find({
      customer: req.user._id,
      status: "cancelled",
    })
      .populate("service")
      .sort({ updatedAt: -1 });

    const requests = await RefundRequest.find({ customer: req.user._id });
    const requestMap = {};
    for (const r of requests) {
      requestMap[r.booking.toString()] = r;
    }

    const summary = {};
    for (const booking of cancelled) {
      const bId = booking._id.toString();
      const existingReq = requestMap[bId];
      if (existingReq) {
        summary[bId] = {
          bookingId: bId,
          hasRequest: true,
          request: existingReq,
          eligible: false,
          reason: "A refund request already exists for this booking.",
        };
        continue;
      }

      const payment = await Payment.findOne({ booking: booking._id });
      const { eligible, reason } = await checkEligibility(booking, payment);
      summary[bId] = {
        bookingId: bId,
        hasRequest: false,
        request: null,
        eligible,
        reason: eligible ? null : reason,
        payment: paymentSummary(payment),
      };
    }
    return send(res, summary);
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/refunds/check/:bookingId
 */
exports.checkSingle = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.bookingId))
      return fail(res, "Invalid booking id.", 422);

    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      customer: req.user._id,
    }).populate("service");

    if (!booking) return fail(res, "Booking not found.", 404);

    const existingRequest = await RefundRequest.findOne({ booking: booking._id })
      .populate({ path: "reviewedBy", select: "fullName" });

    if (existingRequest) {
      return send(res, {
        hasRequest: true,
        request: existingRequest,
        eligible: false,
        reason: "A refund request already exists for this booking.",
      });
    }

    const payment = await Payment.findOne({ booking: booking._id });
    const { eligible, reason } = await checkEligibility(booking, payment);

    return send(res, {
      hasRequest: false,
      request: null,
      eligible,
      reason: eligible ? null : reason,
      payment: paymentSummary(payment),
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/refunds/eligible-bookings
 */
exports.eligibleBookings = async (req, res, next) => {
  try {
    const cancelled = await Booking.find({
      customer: req.user._id,
      status: "cancelled",
      paymentMode: "pay_now",
    })
      .populate("service")
      .sort({ updatedAt: -1 });

    const results = [];
    for (const booking of cancelled) {
      const payment = await Payment.findOne({ booking: booking._id });
      const { eligible } = await checkEligibility(booking, payment);
      if (!eligible) continue;
      const existingRequest = await RefundRequest.findOne({ booking: booking._id });
      if (existingRequest) continue;
      results.push({ booking, payment, eligible: true });
    }
    return send(res, results);
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/refunds/request
 * Body: { bookingId }
 */
exports.create = async (req, res, next) => {
  try {
    const { bookingId } = req.body || {};
    if (!bookingId) return fail(res, "bookingId is required.", 422);
    if (!mongoose.isValidObjectId(bookingId))
      return fail(res, "Invalid booking id.", 422);

    const booking = await Booking.findOne({
      _id: bookingId,
      customer: req.user._id,
    }).populate("service");

    if (!booking) return fail(res, "Booking not found.", 404);

    const payment = await Payment.findOne({ booking: booking._id });
    const { eligible, reason } = await checkEligibility(booking, payment);
    if (!eligible) return fail(res, reason, 422);

    const existing = await RefundRequest.findOne({ booking: booking._id });
    if (existing)
      return fail(res, "A refund request already exists for this booking.", 409);

    const cancelledEntry = (booking.statusHistory || []).find((h) => h.status === "cancelled");
    const arrived = arrivedEntry(booking);

    const serviceAmount = Number(
      payment.protectedServiceAmount || payment.amount || booking.totalPrice || 0
    );
    const protectionFee = Number(payment.refundProtectionFee || 0);
    const totalPaid = Number(payment.totalAmount || serviceAmount + protectionFee);

    const refundReq = await RefundRequest.create({
      booking: booking._id,
      payment: payment._id,
      customer: req.user._id,
      serviceAmount,
      protectionFee,
      totalPaid,
      refundAmount: serviceAmount, // protection fee is non-refundable
      cancelledAt: cancelledEntry ? cancelledEntry.at : booking.updatedAt,
      cancellationBeforeArrival: !arrived,
      paymentMethod: payment.method,
      status: "pending",
    });

    return send(res, refundReq, "Refund request submitted successfully.", 201);
  } catch (err) {
    if (err && err.code === 11000)
      return fail(res, "A refund request already exists for this booking.", 409);
    return next(err);
  }
};

/**
 * GET /api/refunds/my-requests
 */
exports.myRequests = async (req, res, next) => {
  try {
    const requests = await RefundRequest.find({ customer: req.user._id })
      .populate({ path: "booking", populate: "service" })
      .sort({ createdAt: -1 });
    return send(res, requests);
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/refunds/my-requests/:id
 */
exports.myRequest = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return fail(res, "Invalid refund request id.", 422);

    const request = await RefundRequest.findOne({
      _id: req.params.id,
      customer: req.user._id,
    }).populate({ path: "booking", populate: "service" });
    if (!request) return fail(res, "Refund request not found.", 404);
    return send(res, request);
  } catch (err) {
    return next(err);
  }
};

// ─── Admin endpoints ─────────────────────────────────────────────────────────

/**
 * GET /api/refunds/admin  (and /api/admin/refunds if adminRouter is mounted)
 */
exports.adminList = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const query = {};
    if (status && status !== "all") query.status = status;

    const requests = await populateAdmin(RefundRequest.find(query)).sort({
      createdAt: -1,
    });

    const filtered = search
      ? requests.filter((r) => {
        const s = String(search).toLowerCase();
        return (
          r.customer?.fullName?.toLowerCase().includes(s) ||
          r.booking?.bookingRef?.toLowerCase().includes(s) ||
          r.booking?.service?.name?.toLowerCase().includes(s) ||
          r._id.toString().includes(s)
        );
      })
      : requests;

    return send(res, filtered);
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /admin/summary
 */
exports.adminSummary = async (req, res, next) => {
  try {
    const counts = await RefundRequest.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const summary = { pending: 0, approved: 0, rejected: 0, processing: 0, processed: 0, failed: 0, total: 0 };
    counts.forEach(({ _id, count }) => {
      if (_id in summary) summary[_id] = count;
      summary.total += count;
    });
    return send(res, summary);
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /admin/:id
 */
exports.adminGet = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return fail(res, "Invalid refund request id.", 422);

    const request = await RefundRequest.findById(req.params.id)
      .populate({ path: "booking", populate: ["service", "provider"] })
      .populate({ path: "customer", select: "fullName email phone" })
      .populate({ path: "payment" })
      .populate({ path: "reviewedBy", select: "fullName email" });
    if (!request) return fail(res, "Refund request not found.", 404);
    return send(res, request);
  } catch (err) {
    return next(err);
  }
};

/**
 * PATCH /admin/:id/approve
 * A failed eligibility re-check returns 422 and leaves the request pending.
 * The status change is atomic (only matches status "pending").
 */
exports.adminApprove = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return fail(res, "Invalid refund request id.", 422);

    const request = await RefundRequest.findById(req.params.id).populate("payment booking");
    if (!request) return fail(res, "Refund request not found.", 404);
    if (request.status !== "pending")
      return fail(res, `Cannot approve a request that is already '${request.status}'.`, 409);

    const { eligible, reason } = await checkEligibility(request.booking, request.payment);
    if (!eligible)
      return fail(res, `Eligibility re-check failed: ${reason}`, 422);

    if (request.payment?.status === "refunded")
      return fail(res, "This payment has already been refunded.", 409);

    // TODO: call the live payment gateway's refund API here
    // (request.payment.transactionReference, request.refundAmount).
    const providerRefundRef = `PENDING-${Date.now().toString(36).toUpperCase()}`;

    const updated = await populateAdmin(
      RefundRequest.findOneAndUpdate(
        { _id: req.params.id, status: "pending" },
        {
          status: "processing",
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
          providerRefundRef,
          providerRefundStatus: "awaiting_gateway",
        },
        { new: true, runValidators: true }
      )
    );

    if (!updated)
      return fail(res, "This request was already reviewed by another admin.", 409);

    return send(
      res,
      updated,
      "Refund approved and queued for processing. Configure the payment gateway to complete the transfer."
    );
  } catch (err) {
    return next(err);
  }
};

/**
 * PATCH /admin/:id/reject
 * Body: { reason }  (also accepts rejectionReason / note / message)
 */
exports.adminReject = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return fail(res, "Invalid refund request id.", 422);

    const reason = pickReason(req.body);
    if (!reason) return fail(res, "A rejection reason is required.", 422);

    const request = await RefundRequest.findById(req.params.id);
    if (!request) return fail(res, "Refund request not found.", 404);
    if (request.status !== "pending")
      return fail(res, `Cannot reject a request that is already '${request.status}'.`, 409);

    const updated = await populateAdmin(
      RefundRequest.findOneAndUpdate(
        { _id: req.params.id, status: "pending" },
        {
          status: "rejected",
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
          rejectionReason: reason.slice(0, 2000),
        },
        { new: true, runValidators: true }
      )
    );

    if (!updated)
      return fail(res, "This request was already reviewed by another admin.", 409);

    return send(res, updated, "Refund request rejected.");
  } catch (err) {
    return next(err);
  }
};