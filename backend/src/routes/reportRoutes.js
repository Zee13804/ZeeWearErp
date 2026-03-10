const express = require('express');
const router = express.Router();
const {
  getStockReport,
  getMovementsReport,
  getFabricReport,
  getAccessoriesReport,
  getPurposeReport,
  getActivityReport,
  getFabricMovementsReport,
  getAccessoryMovementsReport,
  getFilterOptions,
  exportReportExcel,
} = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/filter-options', authenticate, authorize('admin', 'store', 'viewer'), getFilterOptions);
router.get('/stock', authenticate, authorize('admin', 'store', 'viewer'), getStockReport);
router.get('/movements', authenticate, authorize('admin', 'store', 'viewer'), getMovementsReport);
router.get('/fabric', authenticate, authorize('admin', 'store', 'viewer'), getFabricReport);
router.get('/fabric-movements', authenticate, authorize('admin', 'store', 'viewer'), getFabricMovementsReport);
router.get('/accessories', authenticate, authorize('admin', 'store', 'viewer'), getAccessoriesReport);
router.get('/accessory-movements', authenticate, authorize('admin', 'store', 'viewer'), getAccessoryMovementsReport);
router.get('/purpose', authenticate, authorize('admin', 'store', 'viewer'), getPurposeReport);

router.get('/activity', authenticate, authorize('admin', 'store', 'viewer'), getActivityReport);
router.get('/export/:type/excel', authenticate, authorize('admin', 'store', 'viewer'), exportReportExcel);

module.exports = router;
