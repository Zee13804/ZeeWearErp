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
      const [inflow, expOutflow, supplierOutflow, transfersIn, transfersOut, advanceOut, salaryOut, labourOut] = await Promise.all([
        prisma.invoicePayment.aggregate({ where: { accountId: acc.id }, _sum: { amount: true } }),
        prisma.expense.aggregate({ where: { accountId: acc.id }, _sum: { amount: true } }),
        prisma.supplierPayment.aggregate({ where: { accountId: acc.id }, _sum: { amount: true } }),
        prisma.accountTransfer.aggregate({ where: { toAccountId: acc.id }, _sum: { amount: true } }),
        prisma.accountTransfer.aggregate({ where: { fromAccountId: acc.id }, _sum: { amount: true } }),
        prisma.advance.aggregate({ where: { accountId: acc.id }, _sum: { amount: true } }),
        prisma.salaryRecord.aggregate({ where: { accountId: acc.id, isPaid: true }, _sum: { netSalary: true } }),
        prisma.labourPayment.aggregate({ where: { accountId: acc.id }, _sum: { amount: true } }),
      ]);

      const balance =
        acc.openingBalance +
        (inflow._sum.amount || 0) +
        (transfersIn._sum.amount || 0) -
        (expOutflow._sum.amount || 0) -
        (supplierOutflow._sum.amount || 0) -
        (transfersOut._sum.amount || 0) -
        (advanceOut._sum.amount || 0) -
        (salaryOut._sum.netSalary || 0) -
        (labourOut._sum.amount || 0);

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

// ── Per-Account Ledger ────────────────────────────────────

const getAccountLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateFrom, dateTo } = req.query;
    const accountId = parseInt(id);

    const dateFilter = {};
    if (dateFrom || dateTo) {
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23,59,59,999); dateFilter.lte = d; }
    }

    const [account, invoicePayments, expenses, supplierPayments, transfersIn, transfersOut, advances, salaries, labours] = await Promise.all([
      prisma.account.findUnique({ where: { id: accountId }, select: { id: true, name: true, type: true, openingBalance: true } }),
      prisma.invoicePayment.findMany({
        where: { accountId, ...(Object.keys(dateFilter).length && { paymentDate: dateFilter }) },
        include: { invoice: { select: { invoiceNo: true, customer: { select: { name: true } } } } },
        orderBy: { paymentDate: 'asc' },
      }),
      prisma.expense.findMany({
        where: { accountId, ...(Object.keys(dateFilter).length && { expenseDate: dateFilter }) },
        include: { category: { select: { name: true } } },
        orderBy: { expenseDate: 'asc' },
      }),
      prisma.supplierPayment.findMany({
        where: { accountId, ...(Object.keys(dateFilter).length && { paymentDate: dateFilter }) },
        include: { supplier: { select: { name: true } } },
        orderBy: { paymentDate: 'asc' },
      }),
      prisma.accountTransfer.findMany({
        where: { toAccountId: accountId, ...(Object.keys(dateFilter).length && { date: dateFilter }) },
        include: { fromAccount: { select: { name: true } } },
        orderBy: { date: 'asc' },
      }),
      prisma.accountTransfer.findMany({
        where: { fromAccountId: accountId, ...(Object.keys(dateFilter).length && { date: dateFilter }) },
        include: { toAccount: { select: { name: true } } },
        orderBy: { date: 'asc' },
      }),
      prisma.advance.findMany({
        where: { accountId, ...(Object.keys(dateFilter).length && { advanceDate: dateFilter }) },
        include: { employee: { select: { name: true } } },
        orderBy: { advanceDate: 'asc' },
      }),
      prisma.salaryRecord.findMany({
        where: { accountId, isPaid: true, ...(Object.keys(dateFilter).length && { paidAt: dateFilter }) },
        include: { employee: { select: { name: true } } },
        orderBy: { paidAt: 'asc' },
      }),
      prisma.labourPayment.findMany({
        where: { accountId, ...(Object.keys(dateFilter).length && { paymentDate: dateFilter }) },
        orderBy: { paymentDate: 'asc' },
      }),
    ]);

    if (!account) return res.status(404).json({ error: 'Account not found' });

    // Build unified transaction list
    const transactions = [];

    invoicePayments.forEach(p => transactions.push({
      id: `inv-${p.id}`, date: p.paymentDate, type: 'credit',
      description: `Invoice payment – ${p.invoice?.invoiceNo} (${p.invoice?.customer?.name})`,
      amount: p.amount, note: p.note,
    }));

    expenses.forEach(p => transactions.push({
      id: `exp-${p.id}`, date: p.expenseDate, type: 'debit',
      description: `Expense – ${p.category?.name}: ${p.description}`,
      amount: p.amount, note: null,
    }));

    supplierPayments.forEach(p => transactions.push({
      id: `sup-${p.id}`, date: p.paymentDate, type: 'debit',
      description: `Supplier payment – ${p.supplier?.name}`,
      amount: p.amount, note: p.note,
    }));

    transfersIn.forEach(p => transactions.push({
      id: `tin-${p.id}`, date: p.date, type: 'credit',
      description: `Transfer from ${p.fromAccount?.name}`,
      amount: p.amount, note: p.note,
    }));

    transfersOut.forEach(p => transactions.push({
      id: `tout-${p.id}`, date: p.date, type: 'debit',
      description: `Transfer to ${p.toAccount?.name}`,
      amount: p.amount, note: p.note,
    }));

    advances.forEach(p => transactions.push({
      id: `adv-${p.id}`, date: p.advanceDate, type: 'debit',
      description: `Advance – ${p.employee?.name}`,
      amount: p.amount, note: p.reason,
    }));

    salaries.forEach(p => transactions.push({
      id: `sal-${p.id}`, date: p.paidAt || p.createdAt, type: 'debit',
      description: `Salary – ${p.employee?.name} (${p.month}/${p.year})`,
      amount: p.netSalary, note: p.note,
    }));

    labours.forEach(p => transactions.push({
      id: `lab-${p.id}`, date: p.paymentDate, type: 'debit',
      description: `Labour – ${p.workerName}`,
      amount: p.amount, note: p.description,
    }));

    // Sort by date
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Running balance
    let running = account.openingBalance;
    const ledger = transactions.map(t => {
      running += t.type === 'credit' ? t.amount : -t.amount;
      return { ...t, runningBalance: Math.round(running * 100) / 100 };
    });

    return res.json({ account, openingBalance: account.openingBalance, ledger, closingBalance: Math.round(running * 100) / 100 });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch ledger', details: err.message });
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
  getAccountLedger,
  getTransfers, createTransfer, deleteTransfer,
};
