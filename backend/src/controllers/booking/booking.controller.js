const crypto = require('crypto');
const { Booking, Provider, User, ProviderApplication } = require('../../models');
const { activeService, validId } = require('../catalogue/catalogue.controller');
const { ok, fail } = require('../../utils/response');
exports.create = async (req, res, next) => {
  try {
    const body = req.body || {};
    const allowed = ['serviceId', 'providerId', 'addressId', 'scheduledDate', 'scheduledTime', 'notes'];
    if (Object.keys(body).some(k => !allowed.includes(k))) return fail(res, 400, 'Unsupported booking fields');
    if (![body.serviceId, body.providerId, body.addressId].every(validId)) return fail(res, 400, 'Select a service, provider and saved address');
    if (typeof body.scheduledDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.scheduledDate) || typeof body.scheduledTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.scheduledTime)) return fail(res, 400, 'Use a valid date and 24-hour time');
    const day = new Date(`${body.scheduledDate}T00:00:00+05:30`);
    const appointment = new Date(`${body.scheduledDate}T${body.scheduledTime}:00+05:30`);
    if (!Number.isFinite(appointment.getTime()) || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(day) !== body.scheduledDate || appointment <= new Date()) return fail(res, 400, 'Choose a future appointment date and time');
    if (body.notes !== undefined && (typeof body.notes !== 'string' || body.notes.length > 2000)) return fail(res, 400, 'Notes must be under 2000 characters');
    const [service, provider] = await Promise.all([activeService(body.serviceId), Provider.findOne({ _id: body.providerId, status: 'active', isAvailable: { $ne: false }, 'services.service': body.serviceId }).lean()]);
    if (!await ProviderApplication.exists({ provider: body.providerId, service: body.serviceId, status: 'approved' })) return fail(res, 409, 'This provider is not approved for the selected service');
    if (!service || !provider || !await User.exists({ _id: provider.user, status: 'active' })) return fail(res, 409, 'The selected provider or service is no longer available');
    const address = req.user.addresses?.find(a => String(a._id) === body.addressId);
    if (!address || !address.line1) return fail(res, 400, 'Choose one of your saved addresses');
    const weekday = new Date(`${body.scheduledDate}T00:00:00Z`).getUTCDay();
    if (provider.availability?.length && !provider.availability.some(a => a.dayOfWeek === weekday && a.isAvailable && a.startTime <= body.scheduledTime && a.endTime > body.scheduledTime)) return fail(res, 409, 'The provider is unavailable at this time');
    const offering = provider.services.find(s => String(s.service) === body.serviceId);
    const price = offering.priceFrom ?? service.basePrice;
    if (!Number.isFinite(price) || price < 0) return fail(res, 409, 'This provider has no booking price. Please contact support.');
    const hours = Number(body.scheduledTime.slice(0, 2));
    // Preserve the stored time convention so the existing unique slot index also protects seeded bookings.
    const scheduledTime = `${String(hours % 12 || 12).padStart(2, '0')}:${body.scheduledTime.slice(3)} ${hours < 12 ? 'AM' : 'PM'}`;
    const booking = await Booking.create({ bookingRef: `BK-${crypto.randomUUID().toUpperCase()}`, customer: req.user._id,
      provider: provider._id, service: service._id, addressSnapshot: [address.line1, address.areaCity, address.landmark].filter(Boolean).join(', '),
      scheduledDate: day, scheduledTime, timePeriod: hours < 12 ? 'morning' : hours < 17 ? 'afternoon' : 'evening',
      durationHours: service.estDurationHours, serviceFee: price, totalPrice: price, paymentMode: 'pay_on_completion',
      notes: body.notes?.trim(), status: 'pending', statusHistory: [{ status: 'pending', changedBy: req.user._id }] });
    return res.status(201).json({ success: true, data: booking, message: 'Booking requested' });
  } catch (e) {
    if (e.code === 11000) return fail(res, 409, 'This appointment time has already been booked. Choose another time.');
    next(e);
  }
};
exports.details = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid booking ID');
    const booking = await Booking.findOne({ _id: req.params.id, customer: req.user._id }).populate('service provider');
    return booking ? ok(res, booking) : fail(res, 404, 'Booking not found');
  } catch (e) { next(e); }
};
