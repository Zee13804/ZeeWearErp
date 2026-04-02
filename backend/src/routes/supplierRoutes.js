const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
  getPurchases, createPurchase, uploadPurchaseBill, deletePurchase,
  getSupplierPayments, createSupplierPayment, deleteSupplierPayment,
  getSupplierLedger,
} = require('../controllers/supplierController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const adminAuth = [authenticate, authorize('admin')];

router.get('/', ...adminAuth, getSuppliers);
router.post('/', ...adminAuth, createSupplier);
router.put('/:id', ...adminAuth, updateSupplier);
router.delete('/:id', ...adminAuth, deleteSupplier);
router.get('/:id/ledger', ...adminAuth, getSupplierLedger);

router.get('/purchases', ...adminAuth, getPurchases);
router.post('/purchases', ...adminAuth, createPurchase);
router.post('/purchases/:id/bill', ...adminAuth, upload.single('bill'), uploadPurchaseBill);
router.delete('/purchases/:id', ...adminAuth, deletePurchase);

router.get('/payments', ...adminAuth, getSupplierPayments);
router.post('/payments', ...adminAuth, createSupplierPayment);
router.delete('/payments/:id', ...adminAuth, deleteSupplierPayment);

module.exports = router;
