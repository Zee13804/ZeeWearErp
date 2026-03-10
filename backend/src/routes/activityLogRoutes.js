const express = require('express');
const router = express.Router();
const { getActivityLogs, getRecentActivity } = require('../controllers/activityLogController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/', authenticate, authorize('admin'), getActivityLogs);
router.get('/recent', authenticate, getRecentActivity);

module.exports = router;
