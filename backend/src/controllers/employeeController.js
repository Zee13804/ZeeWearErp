const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { notifySalaryPaid, notifyAdvance } = require('../services/notificationService');

// ── Employees ─────────────────────────────────────────────

const getEmployees = async (req, res) => {
  try {
    const { search } = req.query;
    const where = { isActive: true };
    if (search) where.name = { contains: search };

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    const enriched = await Promise.all(employees.map(async (emp) => {
      const [totalAdvances, totalRepaid, empInvoices] = await Promise.all([
        prisma.advance.aggregate({ where: { employeeId: emp.id }, _sum: { amount: true } }),
        prisma.advance.aggregate({ where: { employeeId: emp.id }, _sum: { repaid: true } }),
        prisma.invoice.findMany({ where: { employeeId: emp.id }, select: { totalAmount: true, paidAmount: true } }),
      ]);
      const advanceBalance = (totalAdvances._sum.amount || 0) - (totalRepaid._sum.repaid || 0);
      const invoiceOutstanding = empInvoices.reduce((s, inv) => s + Math.max(0, inv.totalAmount - inv.paidAmount), 0);
      return { ...emp, advanceBalance, invoiceOutstanding };
    }));

    return res.json({ employees: enriched });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch employees', details: err.message });
  }
};

const createEmployee = async (req, res) => {
  try {
    const { name, designation, phone, monthlySalary, joinDate } = req.body;
    if (!name) return res.status(400).json({ error: 'Employee name is required' });

    const employee = await prisma.employee.create({
      data: {
        name,
        designation: designation || null,
        phone: phone || null,
        monthlySalary: monthlySalary ? parseFloat(monthlySalary) : 0,
        joinDate: joinDate ? new Date(joinDate) : null,
      },
    });
    return res.status(201).json({ message: 'Employee created', employee });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create employee', details: err.message });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, designation, phone, monthlySalary, joinDate } = req.body;

    const employee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(designation !== undefined && { designation: designation || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(monthlySalary !== undefined && { monthlySalary: parseFloat(monthlySalary) }),
        ...(joinDate !== undefined && { joinDate: joinDate ? new Date(joinDate) : null }),
      },
    });
    return res.json({ message: 'Employee updated', employee });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update employee', details: err.message });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.employee.update({ where: { id: parseInt(id) }, data: { isActive: false } });
    return res.json({ message: 'Employee deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete employee', details: err.message });
  }
};

// ── Advances ──────────────────────────────────────────────

const getAdvances = async (req, res) => {
  try {
    const { employeeId, dateFrom, dateTo } = req.query;
    const where = {};
    if (employeeId) where.employeeId = parseInt(employeeId);
    if (dateFrom || dateTo) {
      where.advanceDate = {};
      if (dateFrom) where.advanceDate.gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23,59,59,999); where.advanceDate.lte = d; }
    }

    const advances = await prisma.advance.findMany({
      where,
      include: { employee: { select: { id: true, name: true } } },
      orderBy: { advanceDate: 'desc' },
    });
    return res.json({ advances });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch advances', details: err.message });
  }
};

const createAdvance = async (req, res) => {
  try {
    const { employeeId, amount, reason, advanceDate, accountId } = req.body;
    if (!employeeId || !amount) return res.status(400).json({ error: 'employeeId and amount are required' });
    if (!accountId) return res.status(400).json({ error: 'accountId is required — every advance must be linked to an account' });

    const advance = await prisma.advance.create({
      data: {
        employeeId: parseInt(employeeId),
        amount: parseFloat(amount),
        reason: reason || null,
        advanceDate: advanceDate ? new Date(advanceDate) : new Date(),
        accountId: parseInt(accountId),
      },
      include: { employee: { select: { id: true, name: true } } },
    });
    notifyAdvance(advance.employee?.name || '', advance.amount).catch(() => {});
    return res.status(201).json({ message: 'Advance recorded', advance });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create advance', details: err.message });
  }
};

const repayAdvance = async (req, res) => {
  try {
    const { id } = req.params;
    const { repaid } = req.body;
    if (!repaid) return res.status(400).json({ error: 'repaid amount is required' });

    const advance = await prisma.advance.update({
      where: { id: parseInt(id) },
      data: { repaid: { increment: parseFloat(repaid) } },
    });
    return res.json({ message: 'Repayment recorded', advance });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to record repayment', details: err.message });
  }
};

const deleteAdvance = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.advance.delete({ where: { id: parseInt(id) } });
    return res.json({ message: 'Advance deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete advance', details: err.message });
  }
};

// ── Salary Records ────────────────────────────────────────

const getSalaries = async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;
    const where = {};
    if (employeeId) where.employeeId = parseInt(employeeId);
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);

    const salaries = await prisma.salaryRecord.findMany({
      where,
      include: { employee: { select: { id: true, name: true, designation: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    return res.json({ salaries });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch salaries', details: err.message });
  }
};

const createSalary = async (req, res) => {
  try {
    const { employeeId, month, year, baseSalary, advanceDeducted, absenceDays, invoiceDeducted, note, accountId, markPaid } = req.body;
    if (!employeeId || !month || !year || !baseSalary)
      return res.status(400).json({ error: 'employeeId, month, year and baseSalary are required' });
    if (!accountId) return res.status(400).json({ error: 'accountId is required — every salary record must be linked to an account' });

    const eid = parseInt(employeeId);
    const base = parseFloat(baseSalary);
    const deducted = advanceDeducted ? parseFloat(advanceDeducted) : 0;
    const absDays = absenceDays ? parseInt(absenceDays) : 0;
    const absDeduction = absDays > 0 ? parseFloat(((base / 30) * absDays).toFixed(2)) : 0;
    const invDeducted = invoiceDeducted ? parseFloat(invoiceDeducted) : 0;

    if (isNaN(base) || base < 0) return res.status(400).json({ error: 'baseSalary must be a non-negative number' });
    if (isNaN(deducted) || deducted < 0) return res.status(400).json({ error: 'advanceDeducted must be a non-negative number' });
    if (isNaN(absDays) || absDays < 0 || absDays > 31) return res.status(400).json({ error: 'absenceDays must be between 0 and 31' });
    if (isNaN(invDeducted) || invDeducted < 0) return res.status(400).json({ error: 'invoiceDeducted must be a non-negative number' });

    if (invDeducted > 0) {
      const invoices = await prisma.invoice.findMany({ where: { employeeId: eid }, select: { totalAmount: true, paidAmount: true } });
      const outstanding = invoices.reduce((s, inv) => s + inv.totalAmount - inv.paidAmount, 0);
      if (invDeducted > outstanding + 0.01) {
        return res.status(400).json({ error: `invoiceDeducted (${invDeducted}) exceeds outstanding invoice balance (${outstanding.toFixed(2)})` });
      }
    }

    const net = base - deducted - absDeduction - invDeducted;
    const paid = markPaid === true || markPaid === 'true';

    const salary = await prisma.$transaction(async (tx) => {
      const rec = await tx.salaryRecord.create({
        data: {
          employeeId: eid,
          month: parseInt(month),
          year: parseInt(year),
          baseSalary: base,
          advanceDeducted: deducted,
          absenceDays: absDays,
          absenceDeduction: absDeduction,
          invoiceDeducted: invDeducted,
          netSalary: net,
          note: note || null,
          isPaid: paid,
          paidAt: paid ? new Date() : null,
          accountId: parseInt(accountId),
        },
        include: { employee: { select: { id: true, name: true } } },
      });

      if (deducted > 0) {
        const allAdvances = await tx.advance.findMany({
          where: { employeeId: eid },
          orderBy: { advanceDate: 'asc' },
        });
        const outstanding = allAdvances.filter(a => a.repaid < a.amount);
        let remaining = deducted;
        for (const adv of outstanding) {
          if (remaining <= 0) break;
          const unpaid = adv.amount - adv.repaid;
          const toRepay = Math.min(unpaid, remaining);
          await tx.advance.update({
            where: { id: adv.id },
            data: { repaid: { increment: toRepay } },
          });
          remaining -= toRepay;
        }
      }

      if (invDeducted > 0) {
        const empInvoices = await tx.invoice.findMany({
          where: { employeeId: eid },
          orderBy: { invoiceDate: 'asc' },
        });
        const pendingInvoices = empInvoices.filter(inv => inv.paidAmount < inv.totalAmount);
        let remaining = invDeducted;
        for (const inv of pendingInvoices) {
          if (remaining <= 0) break;
          const unpaid = inv.totalAmount - inv.paidAmount;
          const toApply = Math.min(unpaid, remaining);
          const newPaid = inv.paidAmount + toApply;
          await tx.invoice.update({
            where: { id: inv.id },
            data: {
              paidAmount: newPaid,
              status: newPaid >= inv.totalAmount ? 'paid' : 'partial',
            },
          });
          remaining -= toApply;
        }
      }

      return rec;
    });

    if (paid) {
      notifySalaryPaid(salary.employee?.name || '', salary.netSalary).catch(() => {});
    }

    return res.status(201).json({ message: 'Salary record created', salary });
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Salary record for this month already exists' });
    return res.status(500).json({ error: 'Failed to create salary', details: err.message });
  }
};

const getEmployeeInvoiceBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const eid = parseInt(id);

    const employee = await prisma.employee.findUnique({ where: { id: eid } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const invoices = await prisma.invoice.findMany({
      where: { employeeId: eid },
      select: { id: true, invoiceNo: true, invoiceDate: true, totalAmount: true, paidAmount: true, customer: { select: { name: true } } },
      orderBy: { invoiceDate: 'asc' },
    });

    const totalInvoiced = invoices.reduce((s, inv) => s + inv.totalAmount, 0);
    const totalPaid = invoices.reduce((s, inv) => s + inv.paidAmount, 0);
    const outstanding = totalInvoiced - totalPaid;

    const pendingInvoices = invoices
      .filter(inv => inv.totalAmount - inv.paidAmount > 0.001)
      .map(inv => ({
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        invoiceDate: inv.invoiceDate,
        customerName: inv.customer?.name || '',
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        pendingAmount: parseFloat((inv.totalAmount - inv.paidAmount).toFixed(2)),
      }));

    return res.json({
      hasPendingInvoices: pendingInvoices.length > 0,
      totalInvoiced,
      totalPaid,
      outstanding: parseFloat(outstanding.toFixed(2)),
      pendingInvoices,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch invoice balance', details: err.message });
  }
};

const markSalaryPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { accountId } = req.body;
    if (!accountId) return res.status(400).json({ error: 'accountId is required when marking salary as paid' });
    const salary = await prisma.salaryRecord.update({
      where: { id: parseInt(id) },
      data: {
        isPaid: true,
        paidAt: new Date(),
        accountId: parseInt(accountId),
      },
      include: { employee: { select: { name: true } } },
    });
    notifySalaryPaid(salary.employee?.name || '', salary.netSalary).catch(() => {});
    return res.json({ message: 'Salary marked as paid', salary });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update salary', details: err.message });
  }
};

const deleteSalary = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.salaryRecord.delete({ where: { id: parseInt(id) } });
    return res.json({ message: 'Salary record deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete salary', details: err.message });
  }
};

// ── Labour Payments ────────────────────────────────────────

const getLabourPayments = async (req, res) => {
  try {
    const { dateFrom, dateTo, search } = req.query;
    const where = {};
    if (search) where.workerName = { contains: search };
    if (dateFrom || dateTo) {
      where.paymentDate = {};
      if (dateFrom) where.paymentDate.gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23,59,59,999); where.paymentDate.lte = d; }
    }

    const payments = await prisma.labourPayment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
    });
    return res.json({ payments });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch labour payments', details: err.message });
  }
};

const createLabourPayment = async (req, res) => {
  try {
    const { workerName, description, note, amount, weekStart, weekEnd, paymentDate, accountId } = req.body;
    if (!workerName || !amount) return res.status(400).json({ error: 'workerName and amount are required' });
    if (!accountId) return res.status(400).json({ error: 'accountId is required — every labour payment must be linked to an account' });

    const payment = await prisma.labourPayment.create({
      data: {
        workerName,
        description: description || null,
        note: note || null,
        amount: parseFloat(amount),
        weekStart: weekStart ? new Date(weekStart) : null,
        weekEnd: weekEnd ? new Date(weekEnd) : null,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        accountId: parseInt(accountId),
      },
    });
    return res.status(201).json({ message: 'Labour payment recorded', payment });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create labour payment', details: err.message });
  }
};

const deleteLabourPayment = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.labourPayment.delete({ where: { id: parseInt(id) } });
    return res.json({ message: 'Labour payment deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete labour payment', details: err.message });
  }
};

module.exports = {
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
  getAdvances, createAdvance, repayAdvance, deleteAdvance,
  getSalaries, createSalary, markSalaryPaid, deleteSalary,
  getLabourPayments, createLabourPayment, deleteLabourPayment,
  getEmployeeInvoiceBalance,
};
