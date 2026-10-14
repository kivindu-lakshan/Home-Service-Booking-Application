const mongoose = require('mongoose');
const { Review, Booking } = require('../models');
function completedReviews(match) {
 return [
  { $match: match },
  { $lookup: { from: Booking.collection.name, localField: 'booking', foreignField: '_id', as: 'completedBooking' } },
  { $unwind: '$completedBooking' },
  { $match: { 'completedBooking.status': { $in: ['completed', 'in_progress'] }, $expr: { $and: [{ $eq: ['$provider', '$completedBooking.provider'] }, { $eq: ['$customer', '$completedBooking.customer'] }] } } },
 ];
}
async function providerRatings(providers) {
 if (!providers.length) return providers;
 const ids = [...new Set(providers.map(p => String(p._id)))].map(id => new mongoose.Types.ObjectId(id));
 const summaries = await Review.aggregate([...completedReviews({ provider: { $in: ids } }), { $group: { _id: '$provider', ratingAvg: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }]);
 const ratings = new Map(summaries.map(s => [String(s._id), s]));
 return providers.map(p => ({ ...p, ratingAvg: ratings.get(String(p._id))?.ratingAvg || 0, reviewCount: ratings.get(String(p._id))?.reviewCount || 0 }));
}
module.exports = { completedReviews, providerRatings };
