const express = require('express');
const router = express.Router();
const { exportBackup, importBackup } = require('../controllers/backupController');
const { authorize } = require('../middleware/authMiddleware');

router.get('/', authorize('admin'), exportBackup);
router.post('/import', authorize('admin'), importBackup);

module.exports = router;
