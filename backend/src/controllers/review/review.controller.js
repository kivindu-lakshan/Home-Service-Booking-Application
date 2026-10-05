const mongoose = require("mongoose");
const { completedReviews } = require("../../utils/completed-reviews");
const { approvedApplications, publicProvider } = require("../../utils/approved-providers");
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
    if (error?.code === 11000 && error?.keyPattern?.booking) {
      return res.status(409).json({
        success: false,
        data: null,
        message: "This booking already has a review",
      });
    }
    return next(error);
  }
};
exports.byProvider = async (req, res, next) => {
 try {
  const validId = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
  if (!validId(req.params.providerId) || (req.query.serviceId && !validId(req.query.serviceId))) return res.status(400).json({ success: false, data: null, message: 'Invalid provider or service ID' });
  const applications = await approvedApplications({ provider: req.params.providerId, ...(req.query.serviceId ? { service: req.query.serviceId } : {}) });
  if (!applications.some(a => publicProvider(a))) return res.status(404).json({ success: false, data: null, message: 'Approved provider not found for this service' });
  const page = Number(req.query.page || 1);
  if (!Number.isInteger(page) || page < 1 || page > 100000) return res.status(400).json({ success: false, data: null, message: 'Invalid review page' });
  const pipeline = completedReviews({ provider: new mongoose.Types.ObjectId(req.params.providerId) });
  const [result] = await Review.aggregate([...pipeline, { $facet: {
   summary: [{ $group: { _id: null, ratingAvg: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }],
   reviews: [{ $sort: { createdAt: -1, _id: -1 } }, { $skip: (page - 1) * 20 }, { $limit: 20 },
    { $lookup: { from: 'users', localField: 'customer', foreignField: '_id', as: 'author' } },
    { $project: { _id: 1, rating: 1, comment: 1, createdAt: 1, customer: { fullName: { $arrayElemAt: ['$author.fullName', 0] }, avatarUrl: { $arrayElemAt: ['$author.avatarUrl', 0] } } } }],
  } }]);
  const summary = result?.summary[0];
  res.set('Cache-Control', 'private, no-store');
  return send(res, { provider: { ratingAvg: summary?.ratingAvg || 0, reviewCount: summary?.reviewCount || 0 }, reviews: result?.reviews || [], page, pageSize: 20, total: summary?.reviewCount || 0 });
 } catch (error) { next(error); }
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
        .populate({
          path: "provider",
          select: "user ratingAvg",
          populate: { path: "user", select: "fullName" },
        })
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
