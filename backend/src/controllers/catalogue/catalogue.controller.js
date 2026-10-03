const mongoose = require('mongoose');
const { approvedApplications, publicProvider } = require('../../utils/approved-providers');
const { ServiceCategory, Service, Provider, Review } = require('../../models');
const { ok, fail } = require('../../utils/response');
const validId = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
const text = value => typeof value === 'string' ? value.trim().slice(0, 100) : '';
const literal = value => new RegExp(text(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
exports.validId = validId;
exports.categories = async (req, res, next) => {
  try { return ok(res, await ServiceCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean()); }
  catch (e) { next(e); }
};
exports.services = async (req, res, next) => {
  try {
    if (req.query.categoryId && !validId(req.query.categoryId)) return fail(res, 400, 'Invalid category ID');
    const categories = await ServiceCategory.find({ isActive: true, ...(req.query.categoryId ? { _id: req.query.categoryId } : {}) }).select('_id').lean();
    const query = { isActive: true, category: { $in: categories.map(c => c._id) } };
    if (text(req.query.search)) query.$or = [{ name: literal(req.query.search) }, { description: literal(req.query.search) }];
    return ok(res, await Service.find(query).populate('category', 'name icon').sort({ name: 1 }).lean());
  } catch (e) { next(e); }
};
async function activeService(id) {
  const service = await Service.findOne({ _id: id, isActive: true }).populate('category', 'name icon isActive').lean();
  return service?.category?.isActive ? service : null;
}
exports.activeService = activeService;
exports.service = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid service ID');
    const service = await activeService(req.params.id);
    if (!service) return fail(res, 404, 'Service not found');
    const [rating] = await Review.aggregate([{ $match: { service: new mongoose.Types.ObjectId(req.params.id) } }, { $group: { _id: null, ratingAvg: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }]);
    return ok(res, { ...service, ...(rating ? { ratingAvg: rating.ratingAvg, reviewCount: rating.reviewCount } : {}) });
  } catch (e) { next(e); }
};
// This repository stores location on Provider. No separate location schema exists.
const location = provider => ({ city: provider.city, latitude: provider.latitude, longitude: provider.longitude });
const coordinates = p => Number.isFinite(p?.latitude) && Math.abs(p.latitude) <= 90 && Number.isFinite(p?.longitude) && Math.abs(p.longitude) <= 180;
function distance(a, b) {
  const rad = n => n * Math.PI / 180;
  const dlat = rad(b.latitude - a.latitude), dlon = rad(b.longitude - a.longitude);
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dlon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
exports.distance = distance;
function safeProvider(p, serviceId, origin) {
  const offering = p.services?.find(s => String(s.service?._id || s.service) === serviceId);
  const loc = location(p);
  return { _id: p._id, user: p.user ? { _id: p.user._id, fullName: p.user.fullName, avatarUrl: p.user.avatarUrl } : null,
    aboutMe: p.aboutMe, yearsExperience: p.yearsExperience, isVerified: p.isVerified,
    ratingAvg: p.ratingAvg, reviewCount: p.reviewCount, isAvailable: p.isAvailable,
    location: loc, priceFrom: offering?.priceFrom ?? offering?.service?.basePrice,
    services: (p.services || []).filter(s => s.service?.isActive && s.service?.category?.isActive), availability: p.availability,
    ...(coordinates(origin) && coordinates(loc) ? { distanceKm: distance(origin, loc) } : {}) };
}
exports.safeProvider = safeProvider;
exports.providers = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!validId(id)) return fail(res, 400, 'Invalid service ID');
    if (!await activeService(id)) return fail(res, 404, 'Service not found');
    const filter = req.query.filter || 'all';
    if (!['all', 'top_rated', 'nearest', 'lowest_price'].includes(filter)) return fail(res, 400, 'Invalid provider filter');
    // Only saved customer coordinates are used; never infer a device location.
    const origin = req.user.addresses?.find(a => a.isDefault) || req.user.addresses?.[0];
    let rows = (await approvedApplications({ service: id })).map(a => publicProvider(a)).filter(Boolean);
    rows = rows.map(p => ({ ...p, ...(coordinates(origin) && coordinates(p.location) ? { distanceKm: distance(origin, p.location) } : {}) }));
    const search = text(req.query.search).toLowerCase();
    if (search) rows = rows.filter(p => `${p.user?.fullName || ''} ${p.location.city || ''}`.toLowerCase().includes(search));
    const nearestSupported = coordinates(origin) && rows.some(p => Number.isFinite(p.distanceKm));
    if (filter === 'nearest' && !nearestSupported) return fail(res, 422, 'Nearest requires coordinates on your saved address and provider locations.');
    const unknown = Number.POSITIVE_INFINITY;
    if (filter === 'top_rated') rows.sort((a,b) => (b.ratingAvg || 0) - (a.ratingAvg || 0));
    if (filter === 'lowest_price') rows.sort((a,b) => (a.priceFrom ?? unknown) - (b.priceFrom ?? unknown));
    if (filter === 'nearest') rows.sort((a,b) => (a.distanceKm ?? unknown) - (b.distanceKm ?? unknown));
    return ok(res, { providers: rows, nearestSupported });
  } catch (e) { next(e); }
};
exports.provider = async (req, res, next) => {
 try {
  if (!validId(req.params.id) || (req.query.serviceId && !validId(req.query.serviceId))) return fail(res, 400, 'Invalid provider or service ID');
  const applications = await approvedApplications({ provider: req.params.id });
  const selected = req.query.serviceId ? applications.find(a => String(a.service?._id) === req.query.serviceId) : applications.find(a => publicProvider(a));
  const result = selected && publicProvider(selected, applications);
  return result ? ok(res, result) : fail(res, 404, 'Approved provider not found for this service');
 } catch (e) { next(e); }
};
exports.providerLocation = async (req, res, next) => {
 try {
  if (!validId(req.params.id) || (req.query.serviceId && !validId(req.query.serviceId))) return fail(res, 400, 'Invalid provider or service ID');
  const applications = await approvedApplications({ provider: req.params.id, ...(req.query.serviceId ? { service: req.query.serviceId } : {}) });
  const provider = applications.map(a => publicProvider(a)).find(Boolean);
  return provider ? ok(res, provider.location) : fail(res, 404, 'Approved provider location not found');
 } catch (e) { next(e); }
};
