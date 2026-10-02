const router = require('express').Router();
const auth = require('../../middleware/auth');
const role = require('../../middleware/role');
const c = require('../../controllers/catalogue/catalogue.controller');
router.use(auth, role('customer'));
router.get('/categories', c.categories);
router.get('/services', c.services);
router.get('/services/:id/providers', c.providers);
router.get('/services/:id', c.service);
router.get('/providers/:id/location', c.providerLocation);
router.get('/providers/:id', c.provider);
router.use((error, req, res, next) => {
  console.error('Catalogue request failed:', error.name);
  return res.status(500).json({ success: false, data: null, message: 'Unable to load catalogue data. Please try again.' });
});
module.exports = router;
