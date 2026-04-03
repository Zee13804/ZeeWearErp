const express = require('express');
const router = express.Router();
const { authenticate, authorize, authorizeAccounting } = require('../middleware/authMiddleware');
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
  getSupplierLedgerReport,
  getProductionJobsReport,
  getSalaryDueReport,
} = require('../controllers/accountingReportController');

const accAuth = [authenticate, authorizeAccounting];

router.get('/dashboard', ...accAuth, getDashboard);
router.get('/ledger', ...accAuth, getLedger);
router.get('/profit-loss', ...accAuth, getProfitLoss);
router.get('/suppliers', ...accAuth, getSupplierReport);
router.get('/receivables', ...accAuth, getReceivableReport);
router.get('/payroll', ...accAuth, getPayrollReport);
router.get('/monthly-breakdown', ...accAuth, getMonthlyBreakdown);
router.get('/expense-summary', ...accAuth, getExpenseSummary);
router.get('/collection', ...accAuth, getCollectionReport);
router.get('/account-balance', ...accAuth, getAccountBalance);
router.get('/cash-flow', ...accAuth, getCashFlow);
router.get('/sales', ...accAuth, getSalesReport);
router.get('/cost-analysis', ...accAuth, getCostAnalysis);
router.get('/annual-payroll', ...accAuth, getAnnualPayroll);
router.get('/export', ...accAuth, exportCsv);
router.get('/salary-sheet', ...accAuth, getSalarySheet);
router.get('/advance-report', ...accAuth, getAdvanceReport);
router.get('/labour-report', ...accAuth, getLabourReport);
router.get('/invoice-status', ...accAuth, getInvoiceStatus);
router.get('/supplier-ledger', ...accAuth, getSupplierLedgerReport);
router.get('/production-jobs', ...accAuth, getProductionJobsReport);
router.get('/salary-due', ...accAuth, getSalaryDueReport);

module.exports = router;
