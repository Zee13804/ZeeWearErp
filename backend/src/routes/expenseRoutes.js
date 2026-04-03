const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize, authorizeAccounting } = require('../middleware/authMiddleware');
const {
  getCategories, createCategory, deleteCategory,
  getExpenses, createExpense, updateExpense, uploadExpenseBill, deleteExpense,
} = require('../controllers/expenseController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const adminAuth = [authenticate, authorize('admin')];
const accAuth = [authenticate, authorizeAccounting];

router.get('/categories', ...accAuth, getCategories);
router.post('/categories', ...accAuth, createCategory);
router.delete('/categories/:id', ...adminAuth, deleteCategory);

router.get('/', ...accAuth, getExpenses);
router.post('/', ...accAuth, createExpense);
router.put('/:id', ...accAuth, updateExpense);
router.post('/:id/bill', ...accAuth, upload.single('bill'), uploadExpenseBill);
router.delete('/:id', ...adminAuth, deleteExpense);

module.exports = router;
