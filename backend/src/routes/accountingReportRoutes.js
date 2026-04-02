const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const {
  getDashboard,
  getLedger,
  getProfitLoss,
  getSupplierReport,
  getReceivableReport,
  getPayrollReport,
} = require('../controllers/accountingReportController');

router.get('/dashboard', authenticate, getDashboard);
router.get('/ledger', authenticate, getLedger);
router.get('/profit-loss', authenticate, getProfitLoss);
router.get('/suppliers', authenticate, getSupplierReport);
router.get('/receivables', authenticate, getReceivableReport);
router.get('/payroll', authenticate, getPayrollReport);

module.exports = router;
