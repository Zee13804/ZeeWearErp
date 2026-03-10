const express = require('express');
const router = express.Router();
const { getPermissions, updatePermissions, getMyPermissions } = require('../controllers/permissionController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/', authenticate, authorize('dev'), getPermissions);
router.put('/', authenticate, authorize('dev'), updatePermissions);
router.get('/me', authenticate, getMyPermissions);

module.exports = router;
