const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Accounts ──────────────────────────────────────────────

const getAccounts = async (req, res) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    const enriched = await Promise.all(accounts.map(async (acc) => {
      const inflow = await prisma.invoicePayment.aggregate({
        where: { accountId: acc.id },
        _sum: { amount: true },
      });
      const expOutflow = await prisma.expense.aggregate({
        where: { accountId: acc.id },
        _sum: { amount: true },
      });
      const supplierOutflow = await prisma.supplierPayment.aggregate({
        where: { accountId: acc.id },
        _sum: { amount: true },
      });
      const transfersIn = await prisma.accountTransfer.aggregate({
        where: { toAccountId: acc.id },
        _sum: { amount: true },
      });
      const transfersOut = await prisma.accountTransfer.aggregate({
        where: { fromAccountId: acc.id },
        _sum: { amount: true },
      });

      const balance =
        acc.openingBalance +
        (inflow._sum.amount || 0) +
        (transfersIn._sum.amount || 0) -
        (expOutflow._sum.amount || 0) -
        (supplierOutflow._sum.amount || 0) -
        (transfersOut._sum.amount || 0);

      return { ...acc, balance: Math.round(balance * 100) / 100 };
    }));

    return res.json({ accounts: enriched });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch accounts', details: err.message });
  }
};

const createAccount = async (req, res) => {
  try {
    const { name, type, description, openingBalance } = req.body;
    if (!name) return res.status(400).json({ error: 'Account name is required' });

    const account = await prisma.account.create({
      data: {
        name,
        type: type || 'cash',
        description: description || null,
        openingBalance: openingBalance ? parseFloat(openingBalance) : 0,
      },
    });
    return res.status(201).json({ message: 'Account created', account });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create account', details: err.message });
  }
};

const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, description, openingBalance } = req.body;

    const account = await prisma.account.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(description !== undefined && { description: description || null }),
        ...(openingBalance !== undefined && { openingBalance: parseFloat(openingBalance) }),
      },
    });
    return res.json({ message: 'Account updated', account });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update account', details: err.message });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.account.update({ where: { id: parseInt(id) }, data: { isActive: false } });
    return res.json({ message: 'Account deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete account', details: err.message });
  }
};

// ── Account Transfers ────────────────────────────────────

const getTransfers = async (req, res) => {
  try {
    const { dateFrom, dateTo, accountId } = req.query;
    const where = {};
    if (accountId) {
      where.OR = [{ fromAccountId: parseInt(accountId) }, { toAccountId: parseInt(accountId) }];
    }
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23,59,59,999); where.date.lte = d; }
    }

    const transfers = await prisma.accountTransfer.findMany({
      where,
      include: {
        fromAccount: { select: { id: true, name: true } },
        toAccount: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
    return res.json({ transfers });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch transfers', details: err.message });
  }
};

const createTransfer = async (req, res) => {
  try {
    const { fromAccountId, toAccountId, amount, note, date } = req.body;
    if (!fromAccountId || !toAccountId || !amount)
      return res.status(400).json({ error: 'fromAccountId, toAccountId and amount are required' });
    if (fromAccountId === toAccountId)
      return res.status(400).json({ error: 'Cannot transfer to the same account' });

    const transfer = await prisma.accountTransfer.create({
      data: {
        fromAccountId: parseInt(fromAccountId),
        toAccountId: parseInt(toAccountId),
        amount: parseFloat(amount),
        note: note || null,
        date: date ? new Date(date) : new Date(),
      },
    });
    return res.status(201).json({ message: 'Transfer recorded', transfer });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create transfer', details: err.message });
  }
};

const deleteTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.accountTransfer.delete({ where: { id: parseInt(id) } });
    return res.json({ message: 'Transfer deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete transfer', details: err.message });
  }
};

module.exports = {
  getAccounts, createAccount, updateAccount, deleteAccount,
  getTransfers, createTransfer, deleteTransfer,
};
