const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize, authorizeAccounting } = require('../middleware/authMiddleware');
const {
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
  getPurchases, createPurchase, updatePurchase, uploadPurchaseBill, deletePurchase,
  getSupplierPayments, createSupplierPayment, updateSupplierPayment, deleteSupplierPayment,
  getSupplierLedger,
} = require('../controllers/supplierController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const adminAuth = [authenticate, authorize('admin')];
const accAuth = [authenticate, authorizeAccounting];

router.get('/', ...accAuth, getSuppliers);
router.post('/', ...adminAuth, createSupplier);
router.put('/:id', ...adminAuth, updateSupplier);
router.delete('/:id', ...adminAuth, deleteSupplier);
router.get('/:id/ledger', ...accAuth, getSupplierLedger);

router.get('/purchases', ...accAuth, getPurchases);
router.post('/purchases', ...accAuth, createPurchase);
router.put('/purchases/:id', ...adminAuth, updatePurchase);
router.post('/purchases/:id/bill', ...accAuth, upload.single('bill'), uploadPurchaseBill);
router.delete('/purchases/:id', ...adminAuth, deletePurchase);

router.get('/payments', ...accAuth, getSupplierPayments);
router.post('/payments', ...accAuth, createSupplierPayment);
router.put('/payments/:id', ...adminAuth, updateSupplierPayment);
router.delete('/payments/:id', ...adminAuth, deleteSupplierPayment);

module.exports = router;
