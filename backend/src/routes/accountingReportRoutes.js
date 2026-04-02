const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  getDashboard,
  getLedger,
  getProfitLoss,
  getSupplierReport,
  getReceivableReport,
  getPayrollReport,
  getMonthlyBreakdown,
  getExpenseSummary,
  getCollectionReport,
} = require('../controllers/accountingReportController');

const adminAuth = [authenticate, authorize('admin')];

router.get('/dashboard', ...adminAuth, getDashboard);
router.get('/ledger', ...adminAuth, getLedger);
router.get('/profit-loss', ...adminAuth, getProfitLoss);
router.get('/suppliers', ...adminAuth, getSupplierReport);
router.get('/receivables', ...adminAuth, getReceivableReport);
router.get('/payroll', ...adminAuth, getPayrollReport);
router.get('/monthly-breakdown', ...adminAuth, getMonthlyBreakdown);
router.get('/expense-summary', ...adminAuth, getExpenseSummary);
router.get('/collection', ...adminAuth, getCollectionReport);

module.exports = router;
