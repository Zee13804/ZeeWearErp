const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Summary Dashboard ─────────────────────────────────────

const getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      accounts,
      monthlyRevenue,
      monthlyExpenses,
      monthlyPurchases,
      pendingInvoices,
      supplierBalances,
    ] = await Promise.all([
      prisma.account.findMany({ where: { isActive: true } }),
      prisma.invoicePayment.aggregate({ where: { paymentDate: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { expenseDate: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } }),
      prisma.supplierPurchase.aggregate({ where: { purchaseDate: { gte: monthStart, lte: monthEnd } }, _sum: { totalAmount: true } }),
      prisma.invoice.findMany({ where: { status: { in: ['unpaid', 'partial'] } }, select: { totalAmount: true, paidAmount: true, discount: true } }),
      prisma.supplier.findMany({ where: { isActive: true }, select: { id: true } }),
    ]);

    const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.discount - inv.paidAmount), 0);

    let supplierDebt = 0;
    for (const s of supplierBalances) {
      const purchased = await prisma.supplierPurchase.aggregate({ where: { supplierId: s.id }, _sum: { totalAmount: true } });
      const paid = await prisma.supplierPayment.aggregate({ where: { supplierId: s.id }, _sum: { amount: true } });
      supplierDebt += (purchased._sum.totalAmount || 0) - (paid._sum.amount || 0);
    }

    const accountDetails = await Promise.all(accounts.map(async (acc) => {
      const inflow = await prisma.invoicePayment.aggregate({ where: { accountId: acc.id }, _sum: { amount: true } });
      const expOut = await prisma.expense.aggregate({ where: { accountId: acc.id }, _sum: { amount: true } });
      const supOut = await prisma.supplierPayment.aggregate({ where: { accountId: acc.id }, _sum: { amount: true } });
      const tIn = await prisma.accountTransfer.aggregate({ where: { toAccountId: acc.id }, _sum: { amount: true } });
      const tOut = await prisma.accountTransfer.aggregate({ where: { fromAccountId: acc.id }, _sum: { amount: true } });
      const balance = acc.openingBalance + (inflow._sum.amount || 0) + (tIn._sum.amount || 0) - (expOut._sum.amount || 0) - (supOut._sum.amount || 0) - (tOut._sum.amount || 0);
      return { id: acc.id, name: acc.name, type: acc.type, balance: Math.round(balance * 100) / 100 };
    }));

    const totalCash = accountDetails.reduce((sum, a) => sum + a.balance, 0);

    return res.json({
      totalCash: Math.round(totalCash * 100) / 100,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
      monthlyExpenses: monthlyExpenses._sum.amount || 0,
      monthlyPurchases: monthlyPurchases._sum.totalAmount || 0,
      pendingReceivable: Math.round(pendingAmount * 100) / 100,
      supplierDebt: Math.round(supplierDebt * 100) / 100,
      accounts: accountDetails,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load dashboard', details: err.message });
  }
};

// ── Ledger / Cash Flow ────────────────────────────────────

const getLedger = async (req, res) => {
  try {
    const { accountId, dateFrom, dateTo } = req.query;
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? (() => { const d = new Date(dateTo); d.setHours(23,59,59,999); return d; })() : null;

    const makeRange = () => {
      const r = {};
      if (from) r.gte = from;
      if (to) r.lte = to;
      return Object.keys(r).length ? r : undefined;
    };

    const accFilter = accountId ? { accountId: parseInt(accountId) } : {};
    const range = makeRange();

    const [invoicePayments, expenses, supplierPayments, transfersIn, transfersOut] = await Promise.all([
      prisma.invoicePayment.findMany({
        where: { ...accFilter, ...(range ? { paymentDate: range } : {}) },
        include: { invoice: { select: { invoiceNo: true, customer: { select: { name: true } } } }, account: { select: { name: true } } },
      }),
      prisma.expense.findMany({
        where: { ...accFilter, ...(range ? { expenseDate: range } : {}) },
        include: { category: { select: { name: true } }, account: { select: { name: true } } },
      }),
      prisma.supplierPayment.findMany({
        where: { ...accFilter, ...(range ? { paymentDate: range } : {}) },
        include: { supplier: { select: { name: true } }, account: { select: { name: true } } },
      }),
      prisma.accountTransfer.findMany({
        where: { ...(accountId ? { toAccountId: parseInt(accountId) } : {}), ...(range ? { date: range } : {}) },
        include: { fromAccount: { select: { name: true } }, toAccount: { select: { name: true } } },
      }),
      prisma.accountTransfer.findMany({
        where: { ...(accountId ? { fromAccountId: parseInt(accountId) } : {}), ...(range ? { date: range } : {}) },
        include: { fromAccount: { select: { name: true } }, toAccount: { select: { name: true } } },
      }),
    ]);

    const entries = [];

    for (const p of invoicePayments) {
      entries.push({ date: p.paymentDate, type: 'IN', category: 'Invoice Receipt', account: p.account?.name, description: `${p.invoice.invoiceNo} - ${p.invoice.customer.name}`, amount: p.amount });
    }
    for (const e of expenses) {
      entries.push({ date: e.expenseDate, type: 'OUT', category: e.category.name, account: e.account?.name, description: e.description, amount: e.amount });
    }
    for (const p of supplierPayments) {
      entries.push({ date: p.paymentDate, type: 'OUT', category: 'Supplier Payment', account: p.account?.name, description: p.supplier.name, amount: p.amount });
    }
    for (const t of transfersIn) {
      entries.push({ date: t.date, type: 'IN', category: 'Transfer In', account: t.toAccount?.name, description: `From ${t.fromAccount.name}`, amount: t.amount });
    }
    for (const t of transfersOut) {
      entries.push({ date: t.date, type: 'OUT', category: 'Transfer Out', account: t.fromAccount?.name, description: `To ${t.toAccount.name}`, amount: t.amount });
    }

    entries.sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalIn = entries.filter(e => e.type === 'IN').reduce((s, e) => s + e.amount, 0);
    const totalOut = entries.filter(e => e.type === 'OUT').reduce((s, e) => s + e.amount, 0);

    return res.json({ entries, totalIn, totalOut, net: totalIn - totalOut });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch ledger', details: err.message });
  }
};

// ── P&L Report ────────────────────────────────────────────

const getProfitLoss = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const from = dateFrom ? new Date(dateFrom) : new Date(new Date().getFullYear(), 0, 1);
    const to = dateTo ? (() => { const d = new Date(dateTo); d.setHours(23,59,59,999); return d; })() : new Date();

    const [revenue, expenses, supplierPurchases, labourPayments, salaries] = await Promise.all([
      prisma.invoicePayment.aggregate({ where: { paymentDate: { gte: from, lte: to } }, _sum: { amount: true } }),
      prisma.expense.groupBy({ by: ['categoryId'], where: { expenseDate: { gte: from, lte: to } }, _sum: { amount: true } }),
      prisma.supplierPurchase.aggregate({ where: { purchaseDate: { gte: from, lte: to } }, _sum: { totalAmount: true } }),
      prisma.labourPayment.aggregate({ where: { paymentDate: { gte: from, lte: to } }, _sum: { amount: true } }),
      prisma.salaryRecord.aggregate({ where: { isPaid: true, paidAt: { gte: from, lte: to } }, _sum: { netSalary: true } }),
    ]);

    const expCats = await prisma.expenseCategory.findMany({ where: { isActive: true } });
    const catMap = {};
    for (const c of expCats) catMap[c.id] = c.name;

    const expenseBreakdown = expenses.map(e => ({
      category: catMap[e.categoryId] || 'Other',
      amount: e._sum.amount || 0,
    }));

    const totalRevenue = revenue._sum.amount || 0;
    const totalExpenses = expenseBreakdown.reduce((s, e) => s + e.amount, 0);
    const totalPurchases = supplierPurchases._sum.totalAmount || 0;
    const totalLabour = labourPayments._sum.amount || 0;
    const totalSalaries = salaries._sum.netSalary || 0;
    const totalCosts = totalExpenses + totalPurchases + totalLabour + totalSalaries;
    const netProfit = totalRevenue - totalCosts;

    return res.json({
      from: from.toISOString(),
      to: to.toISOString(),
      revenue: totalRevenue,
      expenses: totalExpenses,
      expenseBreakdown,
      supplierPurchases: totalPurchases,
      labourPayments: totalLabour,
      salaries: totalSalaries,
      totalCosts,
      netProfit,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch P&L', details: err.message });
  }
};

// ── Supplier Balances ─────────────────────────────────────

const getSupplierReport = async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({ where: { isActive: true } });

    const report = await Promise.all(suppliers.map(async (s) => {
      const purchased = await prisma.supplierPurchase.aggregate({ where: { supplierId: s.id }, _sum: { totalAmount: true } });
      const paid = await prisma.supplierPayment.aggregate({ where: { supplierId: s.id }, _sum: { amount: true } });
      const totalPurchased = purchased._sum.totalAmount || 0;
      const totalPaid = paid._sum.amount || 0;
      return {
        id: s.id, name: s.name, phone: s.phone,
        totalPurchased, totalPaid, balance: totalPurchased - totalPaid,
      };
    }));

    return res.json({ suppliers: report.sort((a, b) => b.balance - a.balance) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch supplier report', details: err.message });
  }
};

// ── Invoice / Receivable Report ───────────────────────────

const getReceivableReport = async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { status: { in: ['unpaid', 'partial'] } },
      include: { customer: { select: { name: true, phone: true } } },
      orderBy: { invoiceDate: 'desc' },
    });

    const report = invoices.map(inv => ({
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      customer: inv.customer.name,
      phone: inv.customer.phone,
      invoiceDate: inv.invoiceDate,
      totalAmount: inv.totalAmount,
      discount: inv.discount,
      paidAmount: inv.paidAmount,
      balance: inv.totalAmount - inv.discount - inv.paidAmount,
      status: inv.status,
    }));

    return res.json({ invoices: report });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch receivable report', details: err.message });
  }
};

// ── Payroll Summary ───────────────────────────────────────

const getPayrollReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const where = {};
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);

    const [salaries, advances, labour] = await Promise.all([
      prisma.salaryRecord.findMany({
        where,
        include: { employee: { select: { name: true, designation: true } } },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      prisma.advance.findMany({
        include: { employee: { select: { name: true } } },
        orderBy: { advanceDate: 'desc' },
      }),
      prisma.labourPayment.findMany({ orderBy: { paymentDate: 'desc' } }),
    ]);

    const totalSalaries = salaries.reduce((s, r) => s + r.netSalary, 0);
    const totalAdvances = advances.reduce((s, a) => s + a.amount, 0);
    const totalRepaid = advances.reduce((s, a) => s + a.repaid, 0);
    const totalLabour = labour.reduce((s, l) => s + l.amount, 0);

    return res.json({
      salaries,
      advances,
      labour,
      totalSalaries,
      totalAdvances,
      totalRepaid,
      outstandingAdvances: totalAdvances - totalRepaid,
      totalLabour,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch payroll report', details: err.message });
  }
};

module.exports = {
  getDashboard,
  getLedger,
  getProfitLoss,
  getSupplierReport,
  getReceivableReport,
  getPayrollReport,
};
