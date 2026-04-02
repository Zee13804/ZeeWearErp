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
      monthlyLabour,
      monthlySalaries,
      pendingInvoices,
      supplierBalances,
    ] = await Promise.all([
      prisma.account.findMany({ where: { isActive: true } }),
      prisma.invoicePayment.aggregate({ where: { paymentDate: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { expenseDate: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } }),
      prisma.supplierPurchase.aggregate({ where: { purchaseDate: { gte: monthStart, lte: monthEnd } }, _sum: { totalAmount: true } }),
      prisma.labourPayment.aggregate({ where: { paymentDate: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } }),
      prisma.salaryRecord.aggregate({ where: { isPaid: true, paidAt: { gte: monthStart, lte: monthEnd } }, _sum: { netSalary: true } }),
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
      const [inflow, expOut, supOut, tIn, tOut, advOut, salOut, labOut] = await Promise.all([
        prisma.invoicePayment.aggregate({ where: { accountId: acc.id }, _sum: { amount: true } }),
        prisma.expense.aggregate({ where: { accountId: acc.id }, _sum: { amount: true } }),
        prisma.supplierPayment.aggregate({ where: { accountId: acc.id }, _sum: { amount: true } }),
        prisma.accountTransfer.aggregate({ where: { toAccountId: acc.id }, _sum: { amount: true } }),
        prisma.accountTransfer.aggregate({ where: { fromAccountId: acc.id }, _sum: { amount: true } }),
        prisma.advance.aggregate({ where: { accountId: acc.id }, _sum: { amount: true } }),
        prisma.salaryRecord.aggregate({ where: { accountId: acc.id, isPaid: true }, _sum: { netSalary: true } }),
        prisma.labourPayment.aggregate({ where: { accountId: acc.id }, _sum: { amount: true } }),
      ]);
      const balance = acc.openingBalance + (inflow._sum.amount || 0) + (tIn._sum.amount || 0)
        - (expOut._sum.amount || 0) - (supOut._sum.amount || 0) - (tOut._sum.amount || 0)
        - (advOut._sum.amount || 0) - (salOut._sum.netSalary || 0) - (labOut._sum.amount || 0);
      return { id: acc.id, name: acc.name, type: acc.type, balance: Math.round(balance * 100) / 100 };
    }));

    const totalCash = accountDetails.reduce((sum, a) => sum + a.balance, 0);

    return res.json({
      totalCash: Math.round(totalCash * 100) / 100,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
      monthlyExpenses: monthlyExpenses._sum.amount || 0,
      monthlyPurchases: monthlyPurchases._sum.totalAmount || 0,
      monthlyLabour: monthlyLabour._sum.amount || 0,
      monthlySalaries: monthlySalaries._sum.netSalary || 0,
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

    const [invoicePayments, expenses, supplierPayments, transfersIn, transfersOut, advances, salaries, labours] = await Promise.all([
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
      prisma.advance.findMany({
        where: { ...(accountId ? { accountId: parseInt(accountId) } : {}), ...(range ? { advanceDate: range } : {}) },
        include: { employee: { select: { name: true } }, account: { select: { name: true } } },
      }),
      prisma.salaryRecord.findMany({
        where: { isPaid: true, ...(accountId ? { accountId: parseInt(accountId) } : {}), ...(range ? { paidAt: range } : {}) },
        include: { employee: { select: { name: true } }, account: { select: { name: true } } },
      }),
      prisma.labourPayment.findMany({
        where: { ...(accountId ? { accountId: parseInt(accountId) } : {}), ...(range ? { paymentDate: range } : {}) },
        include: { account: { select: { name: true } } },
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
    for (const a of advances) {
      entries.push({ date: a.advanceDate, type: 'OUT', category: 'Employee Advance', account: a.account?.name || '—', description: `Advance – ${a.employee.name}`, amount: a.amount });
    }
    for (const s of salaries) {
      entries.push({ date: s.paidAt || s.createdAt, type: 'OUT', category: 'Salary', account: s.account?.name || '—', description: `Salary – ${s.employee.name} (${s.month}/${s.year})`, amount: s.netSalary });
    }
    for (const l of labours) {
      entries.push({ date: l.paymentDate, type: 'OUT', category: 'Labour Payment', account: l.account?.name || '—', description: `Labour – ${l.workerName}`, amount: l.amount });
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

// ── Monthly Breakdown (12-month revenue / cost trend) ──────

const getMonthlyBreakdown = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const months = [];
    for (let m = 1; m <= 12; m++) {
      const from = new Date(year, m - 1, 1);
      const to = new Date(year, m, 0, 23, 59, 59, 999);

      const [rev, exp, purch, lab, sal, adv] = await Promise.all([
        prisma.invoicePayment.aggregate({ where: { paymentDate: { gte: from, lte: to } }, _sum: { amount: true } }),
        prisma.expense.aggregate({ where: { expenseDate: { gte: from, lte: to } }, _sum: { amount: true } }),
        prisma.supplierPurchase.aggregate({ where: { purchaseDate: { gte: from, lte: to } }, _sum: { totalAmount: true } }),
        prisma.labourPayment.aggregate({ where: { paymentDate: { gte: from, lte: to } }, _sum: { amount: true } }),
        prisma.salaryRecord.aggregate({ where: { isPaid: true, paidAt: { gte: from, lte: to } }, _sum: { netSalary: true } }),
        prisma.advance.aggregate({ where: { advanceDate: { gte: from, lte: to } }, _sum: { amount: true } }),
      ]);

      const revenue = rev._sum.amount || 0;
      const totalCosts = (exp._sum.amount || 0) + (purch._sum.totalAmount || 0) + (lab._sum.amount || 0) + (sal._sum.netSalary || 0) + (adv._sum.amount || 0);
      months.push({
        month: m,
        year,
        revenue,
        expenses: exp._sum.amount || 0,
        purchases: purch._sum.totalAmount || 0,
        labour: lab._sum.amount || 0,
        salaries: sal._sum.netSalary || 0,
        advances: adv._sum.amount || 0,
        totalCosts,
        netProfit: revenue - totalCosts,
      });
    }
    return res.json({ year, months });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch monthly breakdown', details: err.message });
  }
};

// ── Expense Summary by Category & Account ─────────────────

const getExpenseSummary = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const from = dateFrom ? new Date(dateFrom) : new Date(new Date().getFullYear(), 0, 1);
    const to = dateTo ? (() => { const d = new Date(dateTo); d.setHours(23,59,59,999); return d; })() : new Date();

    const [byCategory, byAccount] = await Promise.all([
      prisma.expense.groupBy({
        by: ['categoryId'],
        where: { expenseDate: { gte: from, lte: to } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.expense.groupBy({
        by: ['accountId'],
        where: { expenseDate: { gte: from, lte: to } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const [cats, accs] = await Promise.all([
      prisma.expenseCategory.findMany(),
      prisma.account.findMany({ select: { id: true, name: true } }),
    ]);
    const catMap = Object.fromEntries(cats.map(c => [c.id, c.name]));
    const accMap = Object.fromEntries(accs.map(a => [a.id, a.name]));

    const total = byCategory.reduce((s, e) => s + (e._sum.amount || 0), 0);

    return res.json({
      from: from.toISOString(),
      to: to.toISOString(),
      total,
      byCategory: byCategory.map(e => ({
        category: catMap[e.categoryId] || 'Uncategorized',
        amount: e._sum.amount || 0,
        count: e._count,
        pct: total > 0 ? Math.round((e._sum.amount || 0) / total * 1000) / 10 : 0,
      })).sort((a, b) => b.amount - a.amount),
      byAccount: byAccount.map(e => ({
        account: e.accountId ? (accMap[e.accountId] || 'Unknown') : 'No Account',
        amount: e._sum.amount || 0,
        count: e._count,
      })).sort((a, b) => b.amount - a.amount),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch expense summary', details: err.message });
  }
};

// ── Collection Report (payments received per account) ──────

const getCollectionReport = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const from = dateFrom ? new Date(dateFrom) : new Date(new Date().getFullYear(), 0, 1);
    const to = dateTo ? (() => { const d = new Date(dateTo); d.setHours(23,59,59,999); return d; })() : new Date();

    const accounts = await prisma.account.findMany({ where: { isActive: true } });
    const report = await Promise.all(accounts.map(async (acc) => {
      const [payments, transfers] = await Promise.all([
        prisma.invoicePayment.findMany({
          where: { accountId: acc.id, paymentDate: { gte: from, lte: to } },
          include: { invoice: { select: { invoiceNo: true, customer: { select: { name: true } } } } },
          orderBy: { paymentDate: 'desc' },
        }),
        prisma.accountTransfer.findMany({
          where: { toAccountId: acc.id, date: { gte: from, lte: to } },
          include: { fromAccount: { select: { name: true } } },
          orderBy: { date: 'desc' },
        }),
      ]);
      const totalReceived = payments.reduce((s, p) => s + p.amount, 0);
      const totalTransfersIn = transfers.reduce((s, t) => s + t.amount, 0);
      return {
        accountId: acc.id,
        accountName: acc.name,
        accountType: acc.type,
        totalReceived,
        totalTransfersIn,
        paymentCount: payments.length,
        payments: payments.map(p => ({
          date: p.paymentDate,
          amount: p.amount,
          invoiceNo: p.invoice.invoiceNo,
          customer: p.invoice.customer.name,
          method: acc.name,
        })),
      };
    }));

    return res.json({
      from: from.toISOString(),
      to: to.toISOString(),
      accounts: report,
      grandTotal: report.reduce((s, a) => s + a.totalReceived, 0),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch collection report', details: err.message });
  }
};

// ── Account Balance Summary ────────────────────────────────

const getAccountBalance = async (req, res) => {
  try {
    const accounts = await prisma.account.findMany({ where: { isActive: true } });
    const details = await Promise.all(accounts.map(async (acc) => {
      const [inflow, expOut, supOut, tIn, tOut, advOut, salOut, labOut] = await Promise.all([
        prisma.invoicePayment.aggregate({ where: { accountId: acc.id }, _sum: { amount: true } }),
        prisma.expense.aggregate({ where: { accountId: acc.id }, _sum: { amount: true } }),
        prisma.supplierPayment.aggregate({ where: { accountId: acc.id }, _sum: { amount: true } }),
        prisma.accountTransfer.aggregate({ where: { toAccountId: acc.id }, _sum: { amount: true } }),
        prisma.accountTransfer.aggregate({ where: { fromAccountId: acc.id }, _sum: { amount: true } }),
        prisma.advance.aggregate({ where: { accountId: acc.id }, _sum: { amount: true } }),
        prisma.salaryRecord.aggregate({ where: { accountId: acc.id, isPaid: true }, _sum: { netSalary: true } }),
        prisma.labourPayment.aggregate({ where: { accountId: acc.id }, _sum: { amount: true } }),
      ]);
      const totalIn = acc.openingBalance + (inflow._sum.amount || 0) + (tIn._sum.amount || 0);
      const totalOut = (expOut._sum.amount || 0) + (supOut._sum.amount || 0) + (tOut._sum.amount || 0)
        + (advOut._sum.amount || 0) + (salOut._sum.netSalary || 0) + (labOut._sum.amount || 0);
      return {
        id: acc.id, name: acc.name, type: acc.type,
        openingBalance: acc.openingBalance,
        totalInflow: Math.round(totalIn * 100) / 100,
        totalOutflow: Math.round(totalOut * 100) / 100,
        balance: Math.round((totalIn - totalOut) * 100) / 100,
        breakdown: {
          invoiceReceipts: inflow._sum.amount || 0,
          transfersIn: tIn._sum.amount || 0,
          expenses: expOut._sum.amount || 0,
          supplierPayments: supOut._sum.amount || 0,
          transfersOut: tOut._sum.amount || 0,
          advances: advOut._sum.amount || 0,
          salaries: salOut._sum.netSalary || 0,
          labour: labOut._sum.amount || 0,
        },
      };
    }));
    return res.json({
      accounts: details,
      totalBalance: Math.round(details.reduce((s, a) => s + a.balance, 0) * 100) / 100,
      totalInflow: Math.round(details.reduce((s, a) => s + a.totalInflow, 0) * 100) / 100,
      totalOutflow: Math.round(details.reduce((s, a) => s + a.totalOutflow, 0) * 100) / 100,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch account balance', details: err.message });
  }
};

// ── Cash Flow Report ───────────────────────────────────────

const getCashFlow = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const from = dateFrom ? new Date(dateFrom) : new Date(new Date().getFullYear(), 0, 1);
    const to = dateTo ? (() => { const d = new Date(dateTo); d.setHours(23,59,59,999); return d; })() : new Date();

    const [invoicePayments, expensesPaid, supplierPaid, advancesPaid, salariesPaid, labourPaid] = await Promise.all([
      prisma.invoicePayment.aggregate({ where: { paymentDate: { gte: from, lte: to } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { expenseDate: { gte: from, lte: to } }, _sum: { amount: true } }),
      prisma.supplierPayment.aggregate({ where: { paymentDate: { gte: from, lte: to } }, _sum: { amount: true } }),
      prisma.advance.aggregate({ where: { advanceDate: { gte: from, lte: to } }, _sum: { amount: true } }),
      prisma.salaryRecord.aggregate({ where: { isPaid: true, paidAt: { gte: from, lte: to } }, _sum: { netSalary: true } }),
      prisma.labourPayment.aggregate({ where: { paymentDate: { gte: from, lte: to } }, _sum: { amount: true } }),
    ]);

    const inflows = [
      { label: 'Invoice Collections', amount: invoicePayments._sum.amount || 0 },
    ];
    const outflows = [
      { label: 'Expenses', amount: expensesPaid._sum.amount || 0 },
      { label: 'Supplier Payments', amount: supplierPaid._sum.amount || 0 },
      { label: 'Employee Advances', amount: advancesPaid._sum.amount || 0 },
      { label: 'Salaries', amount: salariesPaid._sum.netSalary || 0 },
      { label: 'Labour Payments', amount: labourPaid._sum.amount || 0 },
    ];
    const totalIn = inflows.reduce((s, i) => s + i.amount, 0);
    const totalOut = outflows.reduce((s, o) => s + o.amount, 0);

    return res.json({
      from: from.toISOString(),
      to: to.toISOString(),
      inflows,
      outflows,
      totalIn,
      totalOut,
      netCashFlow: totalIn - totalOut,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch cash flow', details: err.message });
  }
};

// ── Sales / Invoice Report ─────────────────────────────────

const getSalesReport = async (req, res) => {
  try {
    const { dateFrom, dateTo, status } = req.query;
    const from = dateFrom ? new Date(dateFrom) : new Date(new Date().getFullYear(), 0, 1);
    const to = dateTo ? (() => { const d = new Date(dateTo); d.setHours(23,59,59,999); return d; })() : new Date();

    const where = { invoiceDate: { gte: from, lte: to } };
    if (status && status !== 'all') where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true } },
        payments: { select: { amount: true, paymentDate: true, account: { select: { name: true } } } },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    const report = invoices.map(inv => ({
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      invoiceDate: inv.invoiceDate,
      customer: inv.customer.name,
      phone: inv.customer.phone,
      totalAmount: inv.totalAmount,
      discount: inv.discount,
      netAmount: inv.totalAmount - inv.discount,
      paidAmount: inv.paidAmount,
      balance: inv.totalAmount - inv.discount - inv.paidAmount,
      status: inv.status,
      paymentCount: inv.payments.length,
    }));

    const totalSales = report.reduce((s, i) => s + i.netAmount, 0);
    const totalCollected = report.reduce((s, i) => s + i.paidAmount, 0);
    const totalPending = report.reduce((s, i) => s + i.balance, 0);
    const totalDiscount = report.reduce((s, i) => s + i.discount, 0);

    return res.json({
      from: from.toISOString(),
      to: to.toISOString(),
      invoices: report,
      totalSales,
      totalCollected,
      totalPending,
      totalDiscount,
      invoiceCount: report.length,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch sales report', details: err.message });
  }
};

// ── Cost Analysis Report ───────────────────────────────────

const getCostAnalysis = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const from = dateFrom ? new Date(dateFrom) : new Date(new Date().getFullYear(), 0, 1);
    const to = dateTo ? (() => { const d = new Date(dateTo); d.setHours(23,59,59,999); return d; })() : new Date();

    const [expByCategory, purchases, labour, salaries, expensesList] = await Promise.all([
      prisma.expense.groupBy({
        by: ['categoryId'],
        where: { expenseDate: { gte: from, lte: to } },
        _sum: { amount: true }, _count: true,
      }),
      prisma.supplierPurchase.groupBy({
        by: ['supplierId'],
        where: { purchaseDate: { gte: from, lte: to } },
        _sum: { totalAmount: true }, _count: true,
      }),
      prisma.labourPayment.aggregate({ where: { paymentDate: { gte: from, lte: to } }, _sum: { amount: true }, _count: true }),
      prisma.salaryRecord.aggregate({ where: { isPaid: true, paidAt: { gte: from, lte: to } }, _sum: { netSalary: true }, _count: true }),
      prisma.expense.findMany({
        where: { expenseDate: { gte: from, lte: to } },
        include: { category: { select: { name: true } }, account: { select: { name: true } } },
        orderBy: { expenseDate: 'desc' },
      }),
    ]);

    const [cats, sups] = await Promise.all([
      prisma.expenseCategory.findMany(),
      prisma.supplier.findMany({ select: { id: true, name: true } }),
    ]);
    const catMap = Object.fromEntries(cats.map(c => [c.id, c.name]));
    const supMap = Object.fromEntries(sups.map(s => [s.id, s.name]));

    const totalExpenses = expByCategory.reduce((s, e) => s + (e._sum.amount || 0), 0);
    const totalPurchases = purchases.reduce((s, p) => s + (p._sum.totalAmount || 0), 0);
    const totalLabour = labour._sum.amount || 0;
    const totalSalaries = salaries._sum.netSalary || 0;
    const grandTotal = totalExpenses + totalPurchases + totalLabour + totalSalaries;

    return res.json({
      from: from.toISOString(),
      to: to.toISOString(),
      grandTotal,
      summary: [
        { type: 'Expenses', amount: totalExpenses, pct: grandTotal > 0 ? Math.round(totalExpenses / grandTotal * 1000) / 10 : 0 },
        { type: 'Supplier Purchases', amount: totalPurchases, pct: grandTotal > 0 ? Math.round(totalPurchases / grandTotal * 1000) / 10 : 0 },
        { type: 'Labour', amount: totalLabour, pct: grandTotal > 0 ? Math.round(totalLabour / grandTotal * 1000) / 10 : 0 },
        { type: 'Salaries', amount: totalSalaries, pct: grandTotal > 0 ? Math.round(totalSalaries / grandTotal * 1000) / 10 : 0 },
      ],
      expensesByCategory: expByCategory.map(e => ({
        category: catMap[e.categoryId] || 'Uncategorized',
        amount: e._sum.amount || 0,
        count: e._count,
        pct: totalExpenses > 0 ? Math.round((e._sum.amount || 0) / totalExpenses * 1000) / 10 : 0,
      })).sort((a, b) => b.amount - a.amount),
      purchasesBySupplier: purchases.map(p => ({
        supplier: supMap[p.supplierId] || 'Unknown',
        amount: p._sum.totalAmount || 0,
        count: p._count,
      })).sort((a, b) => b.amount - a.amount),
      expenseDetails: expensesList.map(e => ({
        date: e.expenseDate,
        description: e.description,
        category: e.category?.name || 'Uncategorized',
        account: e.account?.name || '—',
        amount: e.amount,
        billImage: e.billImage || null,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch cost analysis', details: err.message });
  }
};

// ── Annual Payroll Summary ─────────────────────────────────

const getAnnualPayroll = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const [salaries, employees, advances] = await Promise.all([
      prisma.salaryRecord.findMany({
        where: { year },
        include: { employee: { select: { id: true, name: true, designation: true } } },
        orderBy: [{ month: 'asc' }],
      }),
      prisma.employee.findMany({ where: { isActive: true }, select: { id: true, name: true, designation: true } }),
      prisma.advance.findMany({
        where: { advanceDate: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59, 999) } },
        include: { employee: { select: { name: true } } },
      }),
    ]);

    const byEmployee = employees.map(emp => {
      const empSalaries = salaries.filter(s => s.employeeId === emp.id);
      const empAdvances = advances.filter(a => a.employeeId === emp.id);
      return {
        employeeId: emp.id,
        name: emp.name,
        designation: emp.designation,
        totalGross: empSalaries.reduce((s, r) => s + r.baseSalary, 0),
        totalAdvanceDeducted: empSalaries.reduce((s, r) => s + r.advanceDeducted, 0),
        totalNet: empSalaries.reduce((s, r) => s + r.netSalary, 0),
        totalAdvancesTaken: empAdvances.reduce((s, a) => s + a.amount, 0),
        monthsPaid: empSalaries.filter(r => r.isPaid).length,
        months: empSalaries.map(r => ({ month: r.month, gross: r.baseSalary, deductions: r.advanceDeducted, net: r.netSalary, paid: r.isPaid })),
      };
    });

    return res.json({
      year,
      employees: byEmployee,
      totalGross: byEmployee.reduce((s, e) => s + e.totalGross, 0),
      totalDeductions: byEmployee.reduce((s, e) => s + e.totalAdvanceDeducted, 0),
      totalNet: byEmployee.reduce((s, e) => s + e.totalNet, 0),
      totalAdvancesTaken: byEmployee.reduce((s, e) => s + e.totalAdvancesTaken, 0),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch annual payroll', details: err.message });
  }
};

// ── Backend CSV Export ─────────────────────────────────────

const exportCsv = async (req, res) => {
  try {
    const { type, dateFrom, dateTo, year, status } = req.query;
    const from = dateFrom ? new Date(dateFrom) : new Date(new Date().getFullYear(), 0, 1);
    const to = dateTo ? (() => { const d = new Date(dateTo); d.setHours(23,59,59,999); return d; })() : new Date();

    let rows = [];
    let filename = `${type || 'report'}.csv`;

    if (type === 'profit-loss') {
      const [rev, exp, purch, lab, sal] = await Promise.all([
        prisma.invoicePayment.aggregate({ where: { paymentDate: { gte: from, lte: to } }, _sum: { amount: true } }),
        prisma.expense.aggregate({ where: { expenseDate: { gte: from, lte: to } }, _sum: { amount: true } }),
        prisma.supplierPurchase.aggregate({ where: { purchaseDate: { gte: from, lte: to } }, _sum: { totalAmount: true } }),
        prisma.labourPayment.aggregate({ where: { paymentDate: { gte: from, lte: to } }, _sum: { amount: true } }),
        prisma.salaryRecord.aggregate({ where: { isPaid: true, paidAt: { gte: from, lte: to } }, _sum: { netSalary: true } }),
      ]);
      const revenue = rev._sum.amount || 0;
      const totalExpenses = exp._sum.amount || 0;
      const totalPurchases = purch._sum.totalAmount || 0;
      const totalLabour = lab._sum.amount || 0;
      const totalSalaries = sal._sum.netSalary || 0;
      const totalCosts = totalExpenses + totalPurchases + totalLabour + totalSalaries;
      rows = [
        ['Item','Amount'],
        ['Revenue', revenue],
        ['Expenses', totalExpenses],
        ['Supplier Purchases', totalPurchases],
        ['Labour', totalLabour],
        ['Salaries', totalSalaries],
        ['Total Costs', totalCosts],
        ['Net Profit', revenue - totalCosts],
      ];
      filename = `profit-loss-${from.toISOString().slice(0,10)}-${to.toISOString().slice(0,10)}.csv`;
    } else if (type === 'sales') {
      const invoices = await prisma.invoice.findMany({
        where: { invoiceDate: { gte: from, lte: to }, ...(status && status !== 'all' ? { status } : {}) },
        include: { customer: { select: { name: true, phone: true } } },
        orderBy: { invoiceDate: 'desc' },
      });
      rows = [
        ['Invoice No', 'Date', 'Customer', 'Phone', 'Amount', 'Discount', 'Net', 'Paid', 'Balance', 'Status'],
        ...invoices.map(inv => [inv.invoiceNo, new Date(inv.invoiceDate).toLocaleDateString(), inv.customer.name, inv.customer.phone || '', inv.totalAmount, inv.discount, inv.totalAmount - inv.discount, inv.paidAmount, inv.totalAmount - inv.discount - inv.paidAmount, inv.status]),
      ];
      filename = `sales-${from.toISOString().slice(0,10)}-${to.toISOString().slice(0,10)}.csv`;
    } else if (type === 'suppliers') {
      const suppliers = await prisma.supplier.findMany({ where: { isActive: true } });
      const report = await Promise.all(suppliers.map(async (s) => {
        const [purchased, paid] = await Promise.all([
          prisma.supplierPurchase.aggregate({ where: { supplierId: s.id }, _sum: { totalAmount: true } }),
          prisma.supplierPayment.aggregate({ where: { supplierId: s.id }, _sum: { amount: true } }),
        ]);
        return [s.name, s.phone || '', purchased._sum.totalAmount || 0, paid._sum.amount || 0, (purchased._sum.totalAmount || 0) - (paid._sum.amount || 0)];
      }));
      rows = [['Supplier', 'Phone', 'Total Purchased', 'Total Paid', 'Balance Due'], ...report];
      filename = 'supplier-balances.csv';
    } else if (type === 'monthly-breakdown') {
      const y = parseInt(year) || new Date().getFullYear();
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      rows = [['Month', 'Revenue', 'Expenses', 'Purchases', 'Labour', 'Salaries', 'Total Costs', 'Net P&L']];
      for (let m = 1; m <= 12; m++) {
        const mFrom = new Date(y, m - 1, 1);
        const mTo = new Date(y, m, 0, 23, 59, 59, 999);
        const [rev, exp, purch, lab, sal] = await Promise.all([
          prisma.invoicePayment.aggregate({ where: { paymentDate: { gte: mFrom, lte: mTo } }, _sum: { amount: true } }),
          prisma.expense.aggregate({ where: { expenseDate: { gte: mFrom, lte: mTo } }, _sum: { amount: true } }),
          prisma.supplierPurchase.aggregate({ where: { purchaseDate: { gte: mFrom, lte: mTo } }, _sum: { totalAmount: true } }),
          prisma.labourPayment.aggregate({ where: { paymentDate: { gte: mFrom, lte: mTo } }, _sum: { amount: true } }),
          prisma.salaryRecord.aggregate({ where: { isPaid: true, paidAt: { gte: mFrom, lte: mTo } }, _sum: { netSalary: true } }),
        ]);
        const revenue = rev._sum.amount || 0;
        const totalCosts = (exp._sum.amount || 0) + (purch._sum.totalAmount || 0) + (lab._sum.amount || 0) + (sal._sum.netSalary || 0);
        rows.push([monthNames[m-1] + ' ' + y, revenue, exp._sum.amount || 0, purch._sum.totalAmount || 0, lab._sum.amount || 0, sal._sum.netSalary || 0, totalCosts, revenue - totalCosts]);
      }
      filename = `monthly-breakdown-${y}.csv`;
    } else if (type === 'payroll') {
      const y = parseInt(year) || new Date().getFullYear();
      const salaries = await prisma.salaryRecord.findMany({
        where: { year: y },
        include: { employee: { select: { name: true, designation: true } } },
        orderBy: [{ month: 'asc' }],
      });
      rows = [['Employee', 'Designation', 'Month', 'Year', 'Gross', 'Advance Deducted', 'Net', 'Paid']];
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      for (const s of salaries) {
        rows.push([s.employee.name, s.employee.designation || '', monthNames[s.month - 1], s.year, s.baseSalary, s.advanceDeducted, s.netSalary, s.isPaid ? 'Yes' : 'No']);
      }
      filename = `payroll-${y}.csv`;
    } else {
      return res.status(400).json({ error: 'Invalid report type' });
    }

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to export CSV', details: err.message });
  }
};

module.exports = {
  getDashboard,
  getLedger,
  getProfitLoss,
  getSupplierReport,
  getReceivableReport,
  getPayrollReport,
  getMonthlyBreakdown,
  getExpenseSummary,
  getCollectionReport,
  getAccountBalance,
  getCashFlow,
  getSalesReport,
  getCostAnalysis,
  getAnnualPayroll,
  exportCsv,
};
