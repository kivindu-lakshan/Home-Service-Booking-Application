const { ProviderApplication } = require('../models');
// Whitelist public fields; documents, contact details and review audit never leave this query.
async function approvedApplications(filter) {
 return ProviderApplication.find({ ...filter, status: 'approved' })
  .select('provider service professionalName yearsExperience aboutMe priceFrom location')
  .populate({ path: 'provider', select: 'user status ratingAvg reviewCount isAvailable availability', populate: { path: 'user', select: 'fullName avatarUrl status role' } })
  .populate({ path: 'service', select: 'name basePrice isActive category', populate: { path: 'category', select: 'isActive' } })
  .populate('location', 'address latitude longitude').lean();
}
function publicProvider(application, applications = [application]) {
 const p = application.provider;
 if (!p || p.status === 'suspended' || p.user?.status !== 'active' || p.user?.role !== 'provider' || !application.service?.isActive || !application.service.category?.isActive) return null;
 return { _id: p._id, user: { _id: p.user._id, fullName: application.professionalName || p.user.fullName, avatarUrl: p.user.avatarUrl }, aboutMe: application.aboutMe, yearsExperience: application.yearsExperience,
  ratingAvg: p.ratingAvg, reviewCount: p.reviewCount, isAvailable: p.isAvailable, isVerified: true,
  location: { city: application.location?.address, address: application.location?.address, latitude: application.location?.latitude, longitude: application.location?.longitude },
  priceFrom: application.priceFrom ?? application.service.basePrice, availability: p.availability,
  services: applications.filter(a => a.service?.isActive && a.service.category?.isActive).map(a => ({ service: { _id: a.service._id, name: a.service.name, basePrice: a.service.basePrice }, priceFrom: a.priceFrom })) };
}
module.exports = { approvedApplications, publicProvider };
