const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  getCategories, createCategory, deleteCategory,
  getExpenses, createExpense, updateExpense, uploadExpenseBill, deleteExpense,
} = require('../controllers/expenseController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const adminAuth = [authenticate, authorize('admin')];

router.get('/categories', ...adminAuth, getCategories);
router.post('/categories', ...adminAuth, createCategory);
router.delete('/categories/:id', ...adminAuth, deleteCategory);

router.get('/', ...adminAuth, getExpenses);
router.post('/', ...adminAuth, createExpense);
router.put('/:id', ...adminAuth, updateExpense);
router.post('/:id/bill', ...adminAuth, upload.single('bill'), uploadExpenseBill);
router.delete('/:id', ...adminAuth, deleteExpense);

module.exports = router;
