const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize, authorizeAccounting } = require('../middleware/authMiddleware');
const {
  getCustomers, createCustomer, updateCustomer, deleteCustomer,
  getInvoices, createInvoice, updateInvoiceStatus, uploadInvoiceBill, deleteInvoice,
  getInvoicePayments, createInvoicePayment, deleteInvoicePayment,
} = require('../controllers/invoiceController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const adminAuth = [authenticate, authorize('admin')];
const accAuth = [authenticate, authorizeAccounting];

router.get('/customers', ...accAuth, getCustomers);
router.post('/customers', ...accAuth, createCustomer);
router.put('/customers/:id', ...accAuth, updateCustomer);
router.delete('/customers/:id', ...adminAuth, deleteCustomer);

router.get('/', ...accAuth, getInvoices);
router.post('/', ...accAuth, createInvoice);
router.put('/:id/status', ...accAuth, updateInvoiceStatus);
router.post('/:id/bill', ...accAuth, upload.single('bill'), uploadInvoiceBill);
router.delete('/:id', ...adminAuth, deleteInvoice);

router.get('/payments', ...accAuth, getInvoicePayments);
router.post('/payments', ...accAuth, createInvoicePayment);
router.delete('/payments/:id', ...adminAuth, deleteInvoicePayment);

module.exports = router;
