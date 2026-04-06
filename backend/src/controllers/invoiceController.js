const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs');
const { compressToUnder50KB } = require('../utils/compressImage');
const { notifyInvoiceCreated, notifyInvoicePayment } = require('../services/notificationService');

// ── Customers ─────────────────────────────────────────────

const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    const where = { isActive: true };
    if (search) where.name = { contains: search };

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { invoices: true } } },
    });
    return res.json({ customers });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch customers', details: err.message });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { name, phone, email, address, note } = req.body;
    if (!name) return res.status(400).json({ error: 'Customer name is required' });

    const customer = await prisma.customer.create({
      data: { name, phone: phone || null, email: email || null, address: address || null, note: note || null },
    });
    return res.status(201).json({ message: 'Customer created', customer });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create customer', details: err.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, note } = req.body;

    const customer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(address !== undefined && { address: address || null }),
        ...(note !== undefined && { note: note || null }),
      },
    });
    return res.json({ message: 'Customer updated', customer });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update customer', details: err.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.customer.update({ where: { id: parseInt(id) }, data: { isActive: false } });
    return res.json({ message: 'Customer deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete customer', details: err.message });
  }
};

// ── Invoices ──────────────────────────────────────────────

function generateInvoiceNo() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `INV-${y}${m}-${rand}`;
}

const getInvoices = async (req, res) => {
  try {
    const { customerId, status, dateFrom, dateTo, search } = req.query;
    const where = {};
    if (customerId) where.customerId = parseInt(customerId);
    if (status) where.status = status;
    if (search) where.invoiceNo = { contains: search };
    if (dateFrom || dateTo) {
      where.invoiceDate = {};
      if (dateFrom) where.invoiceDate.gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23,59,59,999); where.invoiceDate.lte = d; }
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        items: {
          include: {
            variant: { select: { id: true, sku: true, size: true, color: true } },
          },
        },
        payments: {
          include: { account: { select: { id: true, name: true } } },
        },
      },
      orderBy: { invoiceDate: 'desc' },
    });
    return res.json({ invoices });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch invoices', details: err.message });
  }
};

const createInvoice = async (req, res) => {
  try {
    const { customerId, discount, note, items, invoiceDate, adjustStockOut } = req.body;
    if (!customerId || !items?.length)
      return res.status(400).json({ error: 'customerId and items are required' });

    const totalAmount = items.reduce((sum, i) => sum + parseFloat(i.totalPrice), 0);

    const invoice = await prisma.invoice.create({
      data: {
        customerId: parseInt(customerId),
        invoiceNo: generateInvoiceNo(),
        discount: discount ? parseFloat(discount) : 0,
        totalAmount: Math.round(totalAmount * 100) / 100,
        note: note || null,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        status: 'unpaid',
        items: {
          create: items.map(item => ({
            variantId: item.variantId ? parseInt(item.variantId) : null,
            description: item.description,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            totalPrice: parseFloat(item.totalPrice),
          })),
        },
      },
      include: { items: true, customer: true },
    });

    if (adjustStockOut) {
      for (const item of items) {
        if (item.variantId) {
          await prisma.variant.update({
            where: { id: parseInt(item.variantId) },
            data: { quantity: { decrement: parseInt(item.quantity) } },
          });
          await prisma.stockLedger.create({
            data: {
              sku: item.sku || '',
              movementType: 'OUT',
              qty: parseInt(item.quantity),
              purpose: 'Sale',
              note: `Invoice ${invoice.invoiceNo}`,
              reference: invoice.invoiceNo,
            },
          });
        }
      }
    }

    notifyInvoiceCreated(invoice).catch(() => {});
    return res.status(201).json({ message: 'Invoice created', invoice });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create invoice', details: err.message });
  }
};

const updateInvoiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const invoice = await prisma.invoice.update({
      where: { id: parseInt(id) },
      data: { status },
    });
    return res.json({ message: 'Invoice status updated', invoice });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update invoice', details: err.message });
  }
};

const uploadInvoiceBill = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const compressed = await compressToUnder50KB(req.file.buffer);
    const filename = `bill_invoice_${id}_${Date.now()}.jpg`;
    const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, filename), compressed);

    const invoice = await prisma.invoice.update({
      where: { id: parseInt(id) },
      data: { billImage: `/uploads/${filename}` },
    });
    return res.json({ message: 'Bill uploaded', billImage: invoice.billImage });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to upload bill', details: err.message });
  }
};

const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: parseInt(id) } });
    await prisma.invoicePayment.deleteMany({ where: { invoiceId: parseInt(id) } });
    await prisma.invoice.delete({ where: { id: parseInt(id) } });
    return res.json({ message: 'Invoice deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete invoice', details: err.message });
  }
};

// ── Invoice Payments ──────────────────────────────────────

const getInvoicePayments = async (req, res) => {
  try {
    const { invoiceId, dateFrom, dateTo } = req.query;
    const where = {};
    if (invoiceId) where.invoiceId = parseInt(invoiceId);
    if (dateFrom || dateTo) {
      where.paymentDate = {};
      if (dateFrom) where.paymentDate.gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23,59,59,999); where.paymentDate.lte = d; }
    }

    const payments = await prisma.invoicePayment.findMany({
      where,
      include: {
        invoice: { select: { id: true, invoiceNo: true } },
        account: { select: { id: true, name: true } },
      },
      orderBy: { paymentDate: 'desc' },
    });
    return res.json({ payments });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch payments', details: err.message });
  }
};

const createInvoicePayment = async (req, res) => {
  try {
    const { invoiceId, accountId, amount, note, paymentDate } = req.body;
    if (!invoiceId || !accountId || !amount)
      return res.status(400).json({ error: 'invoiceId, accountId and amount are required' });

    const payment = await prisma.invoicePayment.create({
      data: {
        invoiceId: parseInt(invoiceId),
        accountId: parseInt(accountId),
        amount: parseFloat(amount),
        note: note || null,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      },
    });

    const invoice = await prisma.invoice.findUnique({ where: { id: parseInt(invoiceId) } });
    const totalPaid = await prisma.invoicePayment.aggregate({
      where: { invoiceId: parseInt(invoiceId) },
      _sum: { amount: true },
    });
    const paidAmount = totalPaid._sum.amount || 0;
    let status = 'unpaid';
    if (paidAmount >= invoice.totalAmount - invoice.discount) status = 'paid';
    else if (paidAmount > 0) status = 'partial';

    const updatedInvoice = await prisma.invoice.update({
      where: { id: parseInt(invoiceId) },
      data: { paidAmount, status },
      include: { customer: { select: { name: true } } },
    });
    const account = await prisma.account.findUnique({ where: { id: parseInt(accountId) } });
    notifyInvoicePayment(updatedInvoice, parseFloat(amount), account?.name || '').catch(() => {});

    return res.status(201).json({ message: 'Payment recorded', payment });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create payment', details: err.message });
  }
};

const deleteInvoicePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await prisma.invoicePayment.delete({ where: { id: parseInt(id) } });

    const totalPaid = await prisma.invoicePayment.aggregate({
      where: { invoiceId: payment.invoiceId },
      _sum: { amount: true },
    });
    const paidAmount = totalPaid._sum.amount || 0;
    const invoice = await prisma.invoice.findUnique({ where: { id: payment.invoiceId } });
    let status = 'unpaid';
    if (paidAmount >= invoice.totalAmount - invoice.discount) status = 'paid';
    else if (paidAmount > 0) status = 'partial';

    await prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: { paidAmount, status },
    });

    return res.json({ message: 'Payment deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete payment', details: err.message });
  }
};

module.exports = {
  getCustomers, createCustomer, updateCustomer, deleteCustomer,
  getInvoices, createInvoice, updateInvoiceStatus, uploadInvoiceBill, deleteInvoice,
  getInvoicePayments, createInvoicePayment, deleteInvoicePayment,
};
