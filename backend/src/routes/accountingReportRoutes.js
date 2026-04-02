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
  getAccountBalance,
  getCashFlow,
  getSalesReport,
  getCostAnalysis,
  getAnnualPayroll,
  exportCsv,
  getSalarySheet,
  getAdvanceReport,
  getLabourReport,
  getInvoiceStatus,
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
router.get('/account-balance', ...adminAuth, getAccountBalance);
router.get('/cash-flow', ...adminAuth, getCashFlow);
router.get('/sales', ...adminAuth, getSalesReport);
router.get('/cost-analysis', ...adminAuth, getCostAnalysis);
router.get('/annual-payroll', ...adminAuth, getAnnualPayroll);
router.get('/export', ...adminAuth, exportCsv);
router.get('/salary-sheet', ...adminAuth, getSalarySheet);
router.get('/advance-report', ...adminAuth, getAdvanceReport);
router.get('/labour-report', ...adminAuth, getLabourReport);
router.get('/invoice-status', ...adminAuth, getInvoiceStatus);

module.exports = router;
