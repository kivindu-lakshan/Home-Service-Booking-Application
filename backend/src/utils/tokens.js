const crypto = require('crypto'); const jwt = require('jsonwebtoken');
exports.signAccessToken = (user) => jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
exports.randomToken = () => crypto.randomBytes(32).toString('hex');
exports.hashToken = (value) => crypto.createHash('sha256').update(value).digest('hex');