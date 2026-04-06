const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs');
const { compressToUnder50KB } = require('../utils/compressImage');
const { notifyExpense } = require('../services/notificationService');

// ── Expense Categories ────────────────────────────────────

const getCategories = async (req, res) => {
  try {
    const cats = await prisma.expenseCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { expenses: true } } },
    });
    return res.json({ categories: cats });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch categories', details: err.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    const cat = await prisma.expenseCategory.create({
      data: { name, type: type || 'other' },
    });
    return res.status(201).json({ message: 'Category created', category: cat });
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Category name already exists' });
    return res.status(500).json({ error: 'Failed to create category', details: err.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.expenseCategory.update({ where: { id: parseInt(id) }, data: { isActive: false } });
    return res.json({ message: 'Category deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete category', details: err.message });
  }
};

// ── Expenses ──────────────────────────────────────────────

const getExpenses = async (req, res) => {
  try {
    const { categoryId, accountId, dateFrom, dateTo, search, collection } = req.query;
    const where = {};
    if (categoryId) where.categoryId = parseInt(categoryId);
    if (accountId) where.accountId = parseInt(accountId);
    if (collection) where.collection = { contains: collection };
    if (search) where.description = { contains: search };
    if (dateFrom || dateTo) {
      where.expenseDate = {};
      if (dateFrom) where.expenseDate.gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23,59,59,999); where.expenseDate.lte = d; }
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, type: true } },
        account: { select: { id: true, name: true } },
      },
      orderBy: { expenseDate: 'desc' },
    });
    return res.json({ expenses });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch expenses', details: err.message });
  }
};

const createExpense = async (req, res) => {
  try {
    const { categoryId, accountId, amount, description, collection, expenseDate } = req.body;
    if (!categoryId || !accountId || !amount || !description)
      return res.status(400).json({ error: 'categoryId, accountId, amount and description are required' });

    const expense = await prisma.expense.create({
      data: {
        categoryId: parseInt(categoryId),
        accountId: parseInt(accountId),
        amount: parseFloat(amount),
        description,
        collection: collection || null,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      },
      include: {
        category: { select: { id: true, name: true } },
        account: { select: { id: true, name: true } },
      },
    });
    notifyExpense(expense.amount, expense.description, expense.category?.name || '', expense.account?.name || '').catch(() => {});
    return res.status(201).json({ message: 'Expense recorded', expense });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create expense', details: err.message });
  }
};

const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, accountId, amount, description, collection, expenseDate } = req.body;

    const expense = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: {
        ...(categoryId && { categoryId: parseInt(categoryId) }),
        ...(accountId && { accountId: parseInt(accountId) }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(description && { description }),
        ...(collection !== undefined && { collection: collection || null }),
        ...(expenseDate && { expenseDate: new Date(expenseDate) }),
      },
    });
    return res.json({ message: 'Expense updated', expense });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update expense', details: err.message });
  }
};

const uploadExpenseBill = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const compressed = await compressToUnder50KB(req.file.buffer);
    const filename = `bill_expense_${id}_${Date.now()}.jpg`;
    const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, filename), compressed);

    const expense = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: { billImage: `/uploads/${filename}` },
    });
    return res.json({ message: 'Bill uploaded', billImage: expense.billImage });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to upload bill', details: err.message });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.expense.delete({ where: { id: parseInt(id) } });
    return res.json({ message: 'Expense deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete expense', details: err.message });
  }
};

module.exports = {
  getCategories, createCategory, deleteCategory,
  getExpenses, createExpense, updateExpense, uploadExpenseBill, deleteExpense,
};
