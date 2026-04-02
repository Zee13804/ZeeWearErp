const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  getCustomers, createCustomer, updateCustomer, deleteCustomer,
  getInvoices, createInvoice, updateInvoiceStatus, uploadInvoiceBill, deleteInvoice,
  getInvoicePayments, createInvoicePayment, deleteInvoicePayment,
} = require('../controllers/invoiceController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const adminAuth = [authenticate, authorize('admin')];

router.get('/customers', ...adminAuth, getCustomers);
router.post('/customers', ...adminAuth, createCustomer);
router.put('/customers/:id', ...adminAuth, updateCustomer);
router.delete('/customers/:id', ...adminAuth, deleteCustomer);

router.get('/', ...adminAuth, getInvoices);
router.post('/', ...adminAuth, createInvoice);
router.put('/:id/status', ...adminAuth, updateInvoiceStatus);
router.post('/:id/bill', ...adminAuth, upload.single('bill'), uploadInvoiceBill);
router.delete('/:id', ...adminAuth, deleteInvoice);

router.get('/payments', ...adminAuth, getInvoicePayments);
router.post('/payments', ...adminAuth, createInvoicePayment);
router.delete('/payments/:id', ...adminAuth, deleteInvoicePayment);

module.exports = router;
