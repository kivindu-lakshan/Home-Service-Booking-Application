<<<<<<< HEAD
const router = require('express').Router();
const c = require('../../controllers/booking/booking.controller');
router.use(require('../../middleware/auth'), require('../../middleware/role')('customer'));
router.post('/', c.create);
router.get('/:id', c.details);
router.use((error, req, res, next) => {
  console.error('Booking request failed:', error.name);
  return res.status(500).json({ success: false, data: null, message: 'Unable to complete the booking request. Check your bookings before retrying.' });
});
=======
const router = require("express").Router();
const auth = require("../../middleware/auth");
const role = require("../../middleware/role");
const controller = require("../../controllers/booking/booking.controller");

router.post("/", auth, role("customer"), controller.create);
>>>>>>> origin/origin-02/feature/payment,review,admin
module.exports = router;
