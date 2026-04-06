const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { notifySupplierPayment } = require('../services/notificationService');
const path = require('path');
const fs = require('fs');
const { compressToUnder50KB } = require('../utils/compressImage');

// ── Suppliers ────────────────────────────────────────────

const getSuppliers = async (req, res) => {
  try {
    const { search } = req.query;
    const where = { isActive: true };
    if (search) where.name = { contains: search };

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { purchases: true } },
      },
    });

    const enriched = await Promise.all(suppliers.map(async (s) => {
      const totalPurchased = await prisma.supplierPurchase.aggregate({
        where: { supplierId: s.id },
        _sum: { totalAmount: true },
      });
      const totalPaid = await prisma.supplierPayment.aggregate({
        where: { supplierId: s.id },
        _sum: { amount: true },
      });
      return {
        ...s,
        totalPurchased: totalPurchased._sum.totalAmount || 0,
        totalPaid: totalPaid._sum.amount || 0,
        balance: (totalPurchased._sum.totalAmount || 0) - (totalPaid._sum.amount || 0),
      };
    }));

    return res.json({ suppliers: enriched });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch suppliers', details: err.message });
  }
};

const createSupplier = async (req, res) => {
  try {
    const { name, company, phone, email, address, note } = req.body;
    if (!name) return res.status(400).json({ error: 'Supplier name is required' });

    const supplier = await prisma.supplier.create({
      data: { name, company: company || null, phone: phone || null, email: email || null, address: address || null, note: note || null },
    });
    return res.status(201).json({ message: 'Supplier created', supplier });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create supplier', details: err.message });
  }
};

const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, company, phone, email, address, note } = req.body;

    const supplier = await prisma.supplier.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(company !== undefined && { company: company || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(address !== undefined && { address: address || null }),
        ...(note !== undefined && { note: note || null }),
      },
    });
    return res.json({ message: 'Supplier updated', supplier });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update supplier', details: err.message });
  }
};

const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.supplier.update({ where: { id: parseInt(id) }, data: { isActive: false } });
    return res.json({ message: 'Supplier deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete supplier', details: err.message });
  }
};

// ── Supplier Purchases ───────────────────────────────────

const getPurchases = async (req, res) => {
  try {
    const { supplierId, dateFrom, dateTo, search, collection } = req.query;
    const where = {};
    if (supplierId) where.supplierId = parseInt(supplierId);
    if (search) where.invoiceNo = { contains: search };
    if (collection) where.collection = { contains: collection };
    if (dateFrom || dateTo) {
      where.purchaseDate = {};
      if (dateFrom) where.purchaseDate.gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23,59,59,999); where.purchaseDate.lte = d; }
    }

    const purchases = await prisma.supplierPurchase.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { purchaseDate: 'desc' },
    });
    return res.json({ purchases });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch purchases', details: err.message });
  }
};

const createPurchase = async (req, res) => {
  try {
    const { supplierId, invoiceNo, description, totalAmount, items, purchaseDate, collection } = req.body;
    if (!supplierId || !totalAmount)
      return res.status(400).json({ error: 'supplierId and totalAmount are required' });

    const purchase = await prisma.supplierPurchase.create({
      data: {
        supplierId: parseInt(supplierId),
        invoiceNo: invoiceNo || null,
        description: description || null,
        totalAmount: parseFloat(totalAmount),
        collection: collection ? collection.trim() : null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        items: items?.length ? {
          create: items.map(item => ({
            description: item.description,
            quantity: parseFloat(item.quantity) || 1,
            unit: item.unit || 'pcs',
            unitPrice: parseFloat(item.unitPrice),
            totalPrice: parseFloat(item.totalPrice),
          })),
        } : undefined,
      },
      include: { items: true },
    });
    return res.status(201).json({ message: 'Purchase created', purchase });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create purchase', details: err.message });
  }
};

const uploadPurchaseBill = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const compressed = await compressToUnder50KB(req.file.buffer);
    const filename = `bill_purchase_${id}_${Date.now()}.jpg`;
    const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, filename), compressed);

    const purchase = await prisma.supplierPurchase.update({
      where: { id: parseInt(id) },
      data: { billImage: `/uploads/${filename}` },
    });
    return res.json({ message: 'Bill uploaded', billImage: purchase.billImage });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to upload bill', details: err.message });
  }
};

const deletePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.supplierPurchaseItem.deleteMany({ where: { purchaseId: parseInt(id) } });
    await prisma.supplierPurchase.delete({ where: { id: parseInt(id) } });
    return res.json({ message: 'Purchase deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete purchase', details: err.message });
  }
};

// ── Supplier Payments ────────────────────────────────────

const getSupplierPayments = async (req, res) => {
  try {
    const { supplierId, dateFrom, dateTo } = req.query;
    const where = {};
    if (supplierId) where.supplierId = parseInt(supplierId);
    if (dateFrom || dateTo) {
      where.paymentDate = {};
      if (dateFrom) where.paymentDate.gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23,59,59,999); where.paymentDate.lte = d; }
    }

    const payments = await prisma.supplierPayment.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        account: { select: { id: true, name: true } },
      },
      orderBy: { paymentDate: 'desc' },
    });
    return res.json({ payments });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch payments', details: err.message });
  }
};

const createSupplierPayment = async (req, res) => {
  try {
    const { supplierId, accountId, amount, note, paymentDate } = req.body;
    if (!supplierId || !accountId || !amount)
      return res.status(400).json({ error: 'supplierId, accountId and amount are required' });

    const payment = await prisma.supplierPayment.create({
      data: {
        supplierId: parseInt(supplierId),
        accountId: parseInt(accountId),
        amount: parseFloat(amount),
        note: note || null,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      },
      include: {
        supplier: { select: { id: true, name: true } },
        account: { select: { id: true, name: true } },
      },
    });
    notifySupplierPayment(payment.supplier?.name || '', payment.amount, payment.account?.name || '').catch(() => {});
    return res.status(201).json({ message: 'Payment recorded', payment });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create payment', details: err.message });
  }
};

const deleteSupplierPayment = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.supplierPayment.delete({ where: { id: parseInt(id) } });
    return res.json({ message: 'Payment deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete payment', details: err.message });
  }
};

const getSupplierLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateFrom, dateTo } = req.query;
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? (() => { const d = new Date(dateTo); d.setHours(23,59,59,999); return d; })() : undefined;
    const range = (from || to) ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } : undefined;

    const supplier = await prisma.supplier.findUnique({ where: { id: parseInt(id) } });
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    const [purchases, payments] = await Promise.all([
      prisma.supplierPurchase.findMany({
        where: { supplierId: parseInt(id), ...(range ? { purchaseDate: range } : {}) },
        orderBy: { purchaseDate: 'asc' },
      }),
      prisma.supplierPayment.findMany({
        where: { supplierId: parseInt(id), ...(range ? { paymentDate: range } : {}) },
        include: { account: { select: { name: true } } },
        orderBy: { paymentDate: 'asc' },
      }),
    ]);

    const entries = [];
    for (const p of purchases) {
      entries.push({ date: p.purchaseDate, type: 'debit', description: `Purchase${p.invoiceNo ? ` – ${p.invoiceNo}` : ''}`, amount: p.totalAmount, note: p.description || '' });
    }
    for (const p of payments) {
      entries.push({ date: p.paymentDate, type: 'credit', description: `Payment${p.account ? ` via ${p.account.name}` : ''}`, amount: p.amount, note: p.note });
    }
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    let balance = 0;
    for (const e of entries) {
      balance = e.type === 'debit' ? balance + e.amount : balance - e.amount;
      e.runningBalance = Math.round(balance * 100) / 100;
    }

    const totalPurchased = purchases.reduce((s, p) => s + p.totalAmount, 0);
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

    return res.json({
      supplier: { id: supplier.id, name: supplier.name, phone: supplier.phone },
      ledger: entries,
      totalPurchased,
      totalPaid,
      balance: totalPurchased - totalPaid,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch supplier ledger', details: err.message });
  }
};

module.exports = {
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
  getPurchases, createPurchase, uploadPurchaseBill, deletePurchase,
  getSupplierPayments, createSupplierPayment, deleteSupplierPayment,
  getSupplierLedger,
};
