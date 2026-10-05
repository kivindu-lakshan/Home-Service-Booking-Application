const router = require('express').Router();
const c = require('../../controllers/admin/provider-applications.controller');
// Parent admin router enforces database-backed authentication and admin authorization.
router.get('/', c.list);
router.get('/:id/documents/:documentId', c.document);
router.get('/:id', c.details);
router.patch('/:id/approve', c.approve);
router.patch('/:id/reject', c.reject);
module.exports = router;
