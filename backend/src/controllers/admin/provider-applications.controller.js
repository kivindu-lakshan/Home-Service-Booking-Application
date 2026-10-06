const mongoose = require('mongoose');
const path = require('path');
const { ProviderApplication, Provider, Service, ServiceCategory, User } = require('../../models');
const { ok, fail } = require('../../utils/response');
const validId = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
const populated = query => query.populate({ path: 'provider', select: 'user status', populate: { path: 'user', select: 'fullName email phone' } }).populate({ path: 'service', select: 'name category isActive', populate: { path: 'category', select: 'name' } }).populate('location').populate('reviewedBy', 'fullName');
exports.list = async (req, res, next) => {
 try {
  const status = req.query.status || 'pending';
  if (!['all', 'pending', 'approved', 'rejected'].includes(status)) return fail(res, 400, 'Invalid application status.');
  const page = Number(req.query.page || 1);
  if (!Number.isInteger(page) || page < 1 || page > 100000) return fail(res, 400, 'Invalid page.');
  const filter = status === 'all' ? {} : { status };
  const [items, total, pendingCount] = await Promise.all([populated(ProviderApplication.find(filter)).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 25).limit(25), ProviderApplication.countDocuments(filter), ProviderApplication.countDocuments({ status: 'pending' })]);
  res.set('Cache-Control', 'private, no-store'); return ok(res, { items, total, page, pageSize: 25, pendingCount });
 } catch (e) { next(e); }
};
exports.details = async (req, res, next) => {
 try {
  if (!validId(req.params.id)) return fail(res, 404, 'Application not found.');
  const item = await populated(ProviderApplication.findById(req.params.id));
  res.set('Cache-Control', 'private, no-store'); return item ? ok(res, item) : fail(res, 404, 'Application not found.');
 } catch (e) { next(e); }
};
async function review(req, res, next, status) {
 let session;
 try {
  if (!validId(req.params.id)) return fail(res, 404, 'Application not found.');
  const body = req.body || {};
  if (Object.keys(body).some(key => status !== 'rejected' || key !== 'rejectionReason') || (body.rejectionReason !== undefined && (typeof body.rejectionReason !== 'string' || body.rejectionReason.length > 2000))) return fail(res, 400, 'Provide an optional rejection reason of up to 2000 characters.');
  session = await mongoose.startSession();
  await session.withTransaction(async () => {
   const item = await ProviderApplication.findById(req.params.id).session(session);
   if (!item) throw Object.assign(new Error('Application not found.'), { statusCode: 404 });
   if (item.status !== 'pending') throw Object.assign(new Error('This application has already been reviewed.'), { statusCode: 409 });
   if (status === 'approved') {
    const provider = await Provider.findOne({ _id: item.provider, status: { $ne: 'suspended' } }).session(session);
    const service = await Service.findOne({ _id: item.service, isActive: true }).session(session);
    if (!provider || !service || !await User.exists({ _id: provider.user, role: 'provider', status: 'active' }).session(session) || !await ServiceCategory.exists({ _id: service.category, isActive: true }).session(session)) throw Object.assign(new Error('The provider or service is no longer eligible for approval.'), { statusCode: 409 });
    // Keep the existing booking offering compatible. Application is the approval authority.
    provider.services = provider.services.filter(offering => String(offering.service) !== String(item.service));
    provider.services.push({ service: item.service, priceFrom: item.priceFrom });
    if (provider.status === 'pending_approval') { provider.status = 'active'; provider.isAvailable = true; }
    await provider.save({ session });
   }
   const updated = await ProviderApplication.findOneAndUpdate({ _id: item._id, status: 'pending' }, { $set: { status, reviewedAt: new Date(), reviewedBy: req.user._id, rejectionReason: status === 'rejected' ? (body.rejectionReason || '').trim() : '' } }, { new: true, runValidators: true, session });
   if (!updated) throw Object.assign(new Error('This application has already been reviewed.'), { statusCode: 409 });
  });
  return ok(res, await populated(ProviderApplication.findById(req.params.id)), status === 'approved' ? 'Provider approved for this service.' : 'Application rejected.');
 } catch (e) { if (e.statusCode) return fail(res, e.statusCode, e.message); next(e); }
 finally { if (session) await session.endSession(); }
}
exports.approve = (req, res, next) => review(req, res, next, 'approved');
exports.reject = (req, res, next) => review(req, res, next, 'rejected');
exports.document = async (req, res, next) => {
 try {
  if (!validId(req.params.id) || !validId(req.params.documentId)) return fail(res, 404, 'Document not found.');
  const item = await ProviderApplication.findById(req.params.id).select('+documents.storageKey');
  const document = item?.documents.id(req.params.documentId);
  if (!document || !/^[a-f\d-]+\.(pdf|png|jpg)$/i.test(document.storageKey || '')) return fail(res, 404, 'Document not found.');
  const storage = path.resolve(process.env.PROVIDER_UPLOAD_DIR || path.join(__dirname, '../../../storage/provider-documents'));
  res.set('Cache-Control', 'private, no-store');
  res.download(path.join(storage, document.storageKey), document.name, error => { if (error && !res.headersSent) fail(res, 404, 'Document file unavailable.'); });
 } catch (e) { next(e); }
};
