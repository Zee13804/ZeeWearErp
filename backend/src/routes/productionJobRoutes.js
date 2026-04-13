const express = require('express');
const router = express.Router();
const { authenticate, authorize, authorizeAccounting } = require('../middleware/authMiddleware');
const {
  getJobs, getJob, createJob, updateJob, deleteJob,
  getWorkEntries, createWorkEntry, updateWorkEntry, deleteWorkEntry,
  getVendorPayments, createVendorPayment, deleteVendorPayment,
  getCollections, getVendorLedger,
} = require('../controllers/productionJobController');

const adminAuth = [authenticate, authorize('admin')];
const accAuth = [authenticate, authorizeAccounting];

router.get('/collections', ...accAuth, getCollections);
router.get('/vendor-ledger', ...accAuth, getVendorLedger);

router.get('/', ...accAuth, getJobs);
router.post('/', ...accAuth, createJob);
router.get('/:id', ...accAuth, getJob);
router.put('/:id', ...accAuth, updateJob);
router.delete('/:id', ...adminAuth, deleteJob);

router.get('/:jobId/entries', ...accAuth, getWorkEntries);
router.post('/:jobId/entries', ...accAuth, createWorkEntry);
router.put('/entries/:id', ...accAuth, updateWorkEntry);
router.delete('/entries/:id', ...adminAuth, deleteWorkEntry);

router.get('/:jobId/vendor-payments', ...accAuth, getVendorPayments);
router.post('/:jobId/vendor-payments', ...accAuth, createVendorPayment);
router.delete('/vendor-payments/:id', ...adminAuth, deleteVendorPayment);

module.exports = router;
