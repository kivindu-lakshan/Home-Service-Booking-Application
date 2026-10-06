const router = require('express').Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const { randomUUID } = require('crypto');
const { Provider, Service, ServiceCategory, ProviderApplication, ProviderLocation } = require('../../models');
const auth = require('../../middleware/auth');
const role = require('../../middleware/role');
const storage = path.resolve(process.env.PROVIDER_UPLOAD_DIR || path.join(__dirname, '../../../storage/provider-documents'));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 5, fields: 1, fieldSize: 16000, parts: 6 } }).array('documents', 5);
const fail = (res, code, message) => res.status(code).json({ success: false, data: null, message });
const text = (value, min, max) => typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
const number = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
function validate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'Invalid application.';
  if (['status', 'reviewedAt', 'reviewedBy', 'rejectionReason', 'provider', 'providerId', 'documents', 'user', 'role'].some(key => key in data)) return 'Application identity, documents and status are determined by the server.';
  if (!mongoose.isValidObjectId(data.service)) return 'Select a valid service.';
  if (!text(data.professionalName, 2, 120)) return 'Enter your professional name (2–120 characters).';
  if (!text(data.phone, 7, 30) || !/^[+\d\s()-]+$/.test(data.phone)) return 'Enter a valid phone number.';
  if (!number(data.yearsExperience, 0, 80)) return 'Experience must be between 0 and 80 years.';
  if (!text(data.aboutMe, 10, 2000) || !text(data.qualifications, 3, 2000) || !text(data.skills, 3, 1000)) return 'Complete your description, qualifications and skills.';
  if (data.priceFrom !== undefined && !number(data.priceFrom, 0, 10000000)) return 'Enter a valid starting price.';
  if (!text(data.location?.address, 3, 300) || !number(data.location?.latitude, -90, 90) || !number(data.location?.longitude, -180, 180)) return 'Confirm an address and valid latitude/longitude.';
  return null;
}
function fileType(file) {
  const b = file.buffer;
  if (file.mimetype === 'application/pdf' && /\.pdf$/i.test(file.originalname) && b.subarray(0, 5).toString() === '%PDF-') return '.pdf';
  if (file.mimetype === 'image/png' && /\.png$/i.test(file.originalname) && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return '.png';
  if (file.mimetype === 'image/jpeg' && /\.jpe?g$/i.test(file.originalname) && b[0] === 255 && b[1] === 216 && b[2] === 255) return '.jpg';
  return null;
}
router.use(auth, role('provider'));
router.get('/applications', async (req, res, next) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id });
    const data = provider ? await ProviderApplication.find({ provider: provider._id }).populate('service', 'name category isActive').populate('location').sort({ createdAt: -1 }) : [];
    res.json({ success: true, data, message: 'Your service applications' });
  } catch (error) { next(error); }
});
router.get('/location-search', require('express-rate-limit')({ windowMs: 60000, max: 20 }), async (req, res) => {
  const address = req.query.address;
  if (!text(address, 3, 300)) return fail(res, 400, 'Enter an address to search.');
  if (!process.env.GOOGLE_MAPS_API_KEY) return fail(res, 503, 'Address search is not configured yet. Use your current location or enter coordinates manually.');
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', address); url.searchParams.set('key', process.env.GOOGLE_MAPS_API_KEY);
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const result = await response.json();
    if (result.status !== 'OK' && result.status !== 'ZERO_RESULTS') return fail(res, 503, 'Address search is temporarily unavailable.');
    res.json({ success: true, data: (result.results || []).slice(0, 5).map(item => ({ address: item.formatted_address, latitude: item.geometry.location.lat, longitude: item.geometry.location.lng })), message: 'Matching locations' });
  } catch { fail(res, 503, 'Address search is temporarily unavailable.'); }
});
router.post('/applications', (req, res, next) => upload(req, res, error => {
  if (error) return fail(res, 400, 'Attach up to five files, each no larger than 5 MB.');
  next();
}), async (req, res, next) => {
  let session; let committed = false; const saved = [];
  try {
    let data; try { data = JSON.parse(req.body.application); } catch { return fail(res, 400, 'Invalid application data.'); }
    const problem = validate(data); if (problem) return fail(res, 400, problem);
    const files = req.files || [];
    if (!files.length || files.some(file => !file.size || !fileType(file) || file.originalname.length > 200)) return fail(res, 400, 'Attach at least one valid PDF, PNG or JPEG certificate (maximum 5 MB each).');
    const service = await Service.findOne({ _id: data.service, isActive: true });
    if (!service || !await ServiceCategory.exists({ _id: service.category, isActive: true })) return fail(res, 400, 'This service is no longer available.');
    let provider = await Provider.findOne({ user: req.user._id });
    if (!provider) {
      try { provider = await Provider.findOneAndUpdate({ user: req.user._id }, { $setOnInsert: { user: req.user._id, status: 'pending_approval', isAvailable: false } }, { upsert: true, new: true, setDefaultsOnInsert: true }); }
      catch (error) { if (error.code !== 11000) throw error; provider = await Provider.findOne({ user: req.user._id }); }
    }
    if (provider.status === 'suspended') return fail(res, 403, 'Your provider profile is suspended.');
    if (await ProviderApplication.exists({ provider: provider._id, service: service._id, status: { $in: ['pending', 'approved'] } })) return fail(res, 409, 'You have already applied for this service.');
    await fs.mkdir(storage, { recursive: true });
    const documents = [];
    for (const file of files) {
      const storageKey = randomUUID() + fileType(file); const filePath = path.join(storage, storageKey);
      await fs.writeFile(filePath, file.buffer, { flag: 'wx', mode: 0o600 }); saved.push(filePath);
      documents.push({ name: path.basename(file.originalname), mimeType: file.mimetype, size: file.size, storageKey });
    }
    session = await mongoose.startSession(); let application;
    await session.withTransaction(async () => {
      const [location] = await ProviderLocation.create([{ provider: provider._id, address: data.location.address.trim(), latitude: data.location.latitude, longitude: data.location.longitude }], { session });
      [application] = await ProviderApplication.create([{ provider: provider._id, service: service._id, professionalName: data.professionalName.trim(), phone: data.phone.trim(), yearsExperience: data.yearsExperience, aboutMe: data.aboutMe.trim(), qualifications: data.qualifications.trim(), skills: data.skills.trim(), priceFrom: data.priceFrom, location: location._id, documents, status: 'pending' }], { session });
    });
    committed = true;
    const result = await ProviderApplication.findById(application._id).populate('service', 'name').populate('location');
    res.status(201).json({ success: true, data: result, message: 'Application submitted for review.' });
  } catch (error) {
    if (!committed) await Promise.all(saved.map(file => fs.unlink(file).catch(() => {})));
    if (error.code === 11000) return fail(res, 409, 'You have already applied for this service.');
    next(error);
  } finally { if (session) await session.endSession(); }
});
router.get('/applications/:id/documents/:documentId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.documentId)) return fail(res, 404, 'Document not found.');
    const provider = await Provider.findOne({ user: req.user._id });
    const application = provider && await ProviderApplication.findOne({ _id: req.params.id, provider: provider._id }).select('+documents.storageKey');
    const document = application?.documents.id(req.params.documentId);
    if (!document) return fail(res, 404, 'Document not found.');
    res.set('Cache-Control', 'private, no-store');
    res.download(path.join(storage, document.storageKey), document.name, error => { if (error && !res.headersSent) fail(res, 404, 'Document file unavailable.'); });
  } catch (error) { next(error); }
});
module.exports = router;
module.exports.validate = validate;
module.exports.fileType = fileType;
