const { Booking, Review, Provider } = require("../../models");
const send = (res, data, message = "Success") =>
  res.json({ success: true, data, message });

exports.create = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      _id: req.body.bookingId,
      customer: req.user._id,
    }).populate("service provider");
    if (!booking)
      return res.status(404).json({
        success: false,
        data: null,
        message: "Booking not found for this customer",
      });
    if (booking.status !== "completed")
      return res.status(409).json({
        success: false,
        data: null,
        message: "Only completed bookings can be reviewed",
      });
    if (!booking.provider)
      return res.status(409).json({
        success: false,
        data: null,
        message: "This booking has no provider",
      });
    if (await Review.exists({ booking: booking._id }))
      return res.status(409).json({
        success: false,
        data: null,
        message: "This booking already has a review",
      });
    const review = await Review.create({
      booking: booking._id,
      customer: req.user._id,
      provider: booking.provider._id,
      rating: req.body.rating,
      comment: req.body.comment,
    });
    const [summary] = await Review.aggregate([
      { $match: { provider: booking.provider._id } },
      {
        $group: {
          _id: "$provider",
          ratingAvg: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);
    await Provider.findByIdAndUpdate(booking.provider._id, {
      ratingAvg: summary?.ratingAvg || 0,
      reviewCount: summary?.reviewCount || 0,
    });
    return send(
      res,
      await Review.findById(review._id).populate("customer provider booking"),
      "Review submitted",
    );
  } catch (error) {
    return next(error);
  }
};
exports.byProvider = async (req, res, next) => {
  try {
    const reviews = await Review.find({ provider: req.params.providerId })
      .populate("customer", "fullName avatarUrl")
      .populate("booking", "bookingRef scheduledDate")
      .sort({ createdAt: -1 });
    const provider = await Provider.findById(req.params.providerId).select(
      "ratingAvg reviewCount",
    );
    return send(res, { provider, reviews });
  } catch (error) {
    return next(error);
  }
};
exports.byBooking = async (req, res, next) => {
  try {
    return send(
      res,
      await Review.findOne({ booking: req.params.bookingId }).populate(
        "customer provider",
      ),
    );
  } catch (error) {
    return next(error);
  }
};
exports.mine = async (req, res, next) => {
  try {
    return send(
      res,
      await Review.find({ customer: req.user._id })
        .populate({ path: "provider", select: "user ratingAvg", populate: { path: "user", select: "fullName" } })
        .populate("booking", "bookingRef scheduledDate")
        .sort({ createdAt: -1 }),
    );
  } catch (error) {
    return next(error);
  }
};
async function refreshProvider(providerId) {
  const [summary] = await Review.aggregate([
    { $match: { provider: providerId } },
    {
      $group: {
        _id: "$provider",
        ratingAvg: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);
  await Provider.findByIdAndUpdate(providerId, {
    ratingAvg: summary?.ratingAvg || 0,
    reviewCount: summary?.reviewCount || 0,
  });
}
exports.update = async (req, res, next) => {
  try {
    const review = await Review.findOneAndUpdate(
      { _id: req.params.id, customer: req.user._id },
      { rating: req.body.rating, comment: req.body.comment },
      { new: true, runValidators: true },
    ).populate("provider booking");
    if (!review)
      return res
        .status(404)
        .json({ success: false, data: null, message: "Review not found" });
    await refreshProvider(review.provider._id);
    return send(res, review, "Review updated");
  } catch (error) {
    return next(error);
  }
};
exports.remove = async (req, res, next) => {
  try {
    const review = await Review.findOneAndDelete({
      _id: req.params.id,
      customer: req.user._id,
    });
    if (!review)
      return res
        .status(404)
        .json({ success: false, data: null, message: "Review not found" });
    await refreshProvider(review.provider);
    return send(res, null, "Review deleted");
  } catch (error) {
    return next(error);
  }
};
