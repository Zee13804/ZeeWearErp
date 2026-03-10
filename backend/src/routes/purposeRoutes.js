const express = require('express');
const router = express.Router();
const { getPurposes, createPurpose, deletePurpose } = require('../controllers/purposeController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/', authenticate, getPurposes);
router.post('/', authenticate, authorize('admin', 'store'), createPurpose);
router.delete('/:id', authenticate, authorize('admin'), deletePurpose);

module.exports = router;
