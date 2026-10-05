const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const { randomUUID } = require('crypto');
const { ok, fail } = require('../../utils/response');
// Same local-file/Multer approach as provider documents; only service images are public.
const storage = path.resolve(path.join(__dirname, '../../../storage/service-images'));
const filenamePattern = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\.(png|jpg)$/i;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 } }).single('image');
exports.uploadMiddleware = (req, res, next) => upload(req, res, error => error ? fail(res, 400, 'Select one PNG or JPEG image, maximum 5 MB.') : next());
exports.upload = async (req, res, next) => {
 try {
  const file = req.file; const buffer = file?.buffer; let extension;
  if (file?.mimetype === 'image/png' && /\.png$/i.test(file.originalname) && buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && buffer.subarray(12,16).toString() === 'IHDR') extension = 'png';
  if (file?.mimetype === 'image/jpeg' && /\.jpe?g$/i.test(file.originalname) && buffer.length >= 4 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 && buffer[buffer.length - 2] === 255 && buffer[buffer.length - 1] === 217) extension = 'jpg';
  if (!extension) return fail(res, 400, 'Select a valid PNG or JPEG image, maximum 5 MB.');
  const filename = randomUUID() + '.' + extension;
  await fs.mkdir(storage, { recursive: true }); await fs.writeFile(path.join(storage, filename), buffer, { flag: 'wx', mode: 0o600 });
  return ok(res, { imageUrl: '/api/services/images/' + filename }, 'Service image uploaded.');
 } catch (error) { next(error); }
};
exports.read = (req, res) => {
 if (!filenamePattern.test(req.params.filename)) return fail(res, 404, 'Image not found.');
 res.set('Cross-Origin-Resource-Policy', 'cross-origin'); res.set('Cache-Control', 'public, max-age=31536000, immutable');
 res.sendFile(path.join(storage, req.params.filename), error => { if (error && !res.headersSent) { res.set('Cache-Control', 'no-store'); fail(res, 404, 'Image not found.'); } });
};
exports.storage = storage;
