const express = require('express');
const router = express.Router();
const { authenticate, authorize, authorizeAccounting } = require('../middleware/authMiddleware');
const {
  getPayments, getPayment, createPayment, updatePayment, deletePayment, getSummary,
} = require('../controllers/courierPaymentController');

const adminAuth = [authenticate, authorize('admin')];
const accAuth = [authenticate, authorizeAccounting];

router.get('/summary', ...accAuth, getSummary);
router.get('/', ...accAuth, getPayments);
router.post('/', ...accAuth, createPayment);
router.get('/:id', ...accAuth, getPayment);
router.put('/:id', ...accAuth, updatePayment);
router.delete('/:id', ...adminAuth, deletePayment);

module.exports = router;
