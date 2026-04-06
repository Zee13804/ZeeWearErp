const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, testNotification, sendReportNow } = require('../controllers/settingsController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/', authenticate, getSettings);
router.post('/', authenticate, updateSettings);
router.post('/test-notification', authenticate, testNotification);
router.post('/send-report-now', authenticate, sendReportNow);

module.exports = router;
