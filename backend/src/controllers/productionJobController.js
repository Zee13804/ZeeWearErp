const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { notifyVendorPayment } = require('../services/notificationService');

// ── Production Jobs ──────────────────────────────────────

const getJobs = async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    const [jobs, purchases] = await Promise.all([
      prisma.productionJob.findMany({
        where,
        include: {
          _count: { select: { workEntries: true } },
          workEntries: { select: { totalCost: true } },
          vendorPayments: { select: { amount: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supplierPurchase.findMany({
        where: { collection: { not: null } },
        select: { collection: true, totalAmount: true },
      }),
    ]);

    const materialByCollection = {};
    for (const p of purchases) {
      if (!p.collection) continue;
      const key = p.collection.toLowerCase().trim();
      materialByCollection[key] = (materialByCollection[key] || 0) + p.totalAmount;
    }

    const enriched = jobs.map(job => {
      const totalOutsourceCost = job.workEntries.reduce((s, e) => s + e.totalCost, 0);
      const totalMaterialCost = materialByCollection[job.collection.toLowerCase().trim()] || 0;
      const totalVendorPaid = job.vendorPayments.reduce((s, p) => s + p.amount, 0);
      return {
        ...job,
        totalOutsourceCost,
        totalMaterialCost,
        grandTotal: totalOutsourceCost + totalMaterialCost,
        totalVendorPaid,
        vendorBalance: totalOutsourceCost - totalVendorPaid,
      };
    });

    return res.json({ jobs: enriched });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch production jobs', details: err.message });
  }
};

const getJob = async (req, res) => {
  try {
    const { id } = req.params;
    const jobId = parseInt(id);

    const [job, supplierPurchases] = await Promise.all([
      prisma.productionJob.findUnique({
        where: { id: jobId },
        include: {
          workEntries: {
            orderBy: { workDate: 'desc' },
          },
          vendorPayments: {
            include: {
              account: { select: { id: true, name: true } },
            },
            orderBy: { paymentDate: 'desc' },
          },
        },
      }),
      prisma.supplierPurchase.findMany({
        where: { collection: { not: null } },
        include: {
          supplier: { select: { id: true, name: true } },
          items: true,
        },
        orderBy: { purchaseDate: 'desc' },
      }),
    ]);

    if (!job) return res.status(404).json({ error: 'Production job not found' });

    const linkedPurchases = supplierPurchases.filter(
      p => p.collection && p.collection.toLowerCase().trim() === job.collection.toLowerCase().trim()
    );

    const totalOutsourceCost = job.workEntries.reduce((s, e) => s + e.totalCost, 0);
    const totalMaterialCost = linkedPurchases.reduce((s, p) => s + p.totalAmount, 0);
    const totalVendorPaid = job.vendorPayments.reduce((s, p) => s + p.amount, 0);

    // Build per-vendor summary
    const vendorMap = {};
    for (const entry of job.workEntries) {
      const key = entry.vendorName.toLowerCase().trim();
      if (!vendorMap[key]) {
        vendorMap[key] = { vendorName: entry.vendorName, totalWork: 0, totalPaid: 0, totalAdvance: 0 };
      }
      vendorMap[key].totalWork += entry.totalCost;
    }
    for (const payment of job.vendorPayments) {
      const key = payment.vendorName.toLowerCase().trim();
      if (!vendorMap[key]) {
        vendorMap[key] = { vendorName: payment.vendorName, totalWork: 0, totalPaid: 0, totalAdvance: 0 };
      }
      if (payment.type === 'advance') {
        vendorMap[key].totalAdvance += payment.amount;
      } else {
        vendorMap[key].totalPaid += payment.amount;
      }
    }
    const vendorSummary = Object.values(vendorMap).map(v => ({
      ...v,
      totalReceived: v.totalPaid + v.totalAdvance,
      balance: v.totalWork - (v.totalPaid + v.totalAdvance),
    }));

    return res.json({
      job: {
        ...job,
        totalOutsourceCost,
        totalMaterialCost,
        grandTotal: totalOutsourceCost + totalMaterialCost,
        totalVendorPaid,
        vendorBalance: totalOutsourceCost - totalVendorPaid,
        linkedPurchases,
        vendorSummary,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch job details', details: err.message });
  }
};

const createJob = async (req, res) => {
  try {
    const { collection, description } = req.body;
    if (!collection) return res.status(400).json({ error: 'Collection name is required' });

    const job = await prisma.productionJob.create({
      data: {
        collection: collection.trim(),
        description: description || null,
        status: 'active',
      },
    });
    return res.status(201).json({ message: 'Production job created', job });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create production job', details: err.message });
  }
};

const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { collection, description, status } = req.body;

    const job = await prisma.productionJob.update({
      where: { id: parseInt(id) },
      data: {
        ...(collection && { collection: collection.trim() }),
        ...(description !== undefined && { description: description || null }),
        ...(status && { status }),
      },
    });
    return res.json({ message: 'Job updated', job });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update job', details: err.message });
  }
};

const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const jobId = parseInt(id);

    const entries = await prisma.outsourceWorkEntry.count({ where: { jobId } });
    if (entries > 0) {
      return res.status(400).json({ error: 'Cannot delete job with work entries. Delete all entries first.' });
    }

    // Also delete vendor payments
    await prisma.outsourceVendorPayment.deleteMany({ where: { jobId } });
    await prisma.productionJob.delete({ where: { id: jobId } });
    return res.json({ message: 'Production job deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete job', details: err.message });
  }
};

// ── Outsource Work Entries ───────────────────────────────

const getWorkEntries = async (req, res) => {
  try {
    const { jobId } = req.params;
    const entries = await prisma.outsourceWorkEntry.findMany({
      where: { jobId: parseInt(jobId) },
      orderBy: { workDate: 'desc' },
    });
    return res.json({ entries });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch work entries', details: err.message });
  }
};

const createWorkEntry = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { workType, vendorName, quantity, ratePerPiece, workDate, notes } = req.body;

    if (!workType || !vendorName) {
      return res.status(400).json({ error: 'workType and vendorName are required' });
    }

    const qty = parseFloat(quantity) || 0;
    const rate = parseFloat(ratePerPiece) || 0;
    const totalCost = Math.round(qty * rate * 100) / 100;

    const entry = await prisma.outsourceWorkEntry.create({
      data: {
        jobId: parseInt(jobId),
        workType,
        vendorName,
        quantity: qty,
        ratePerPiece: rate,
        totalCost,
        workDate: workDate ? new Date(workDate) : new Date(),
        notes: notes || null,
      },
    });
    return res.status(201).json({ message: 'Work entry added', entry });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create work entry', details: err.message });
  }
};

const updateWorkEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { workType, vendorName, quantity, ratePerPiece, workDate, notes } = req.body;

    const existing = await prisma.outsourceWorkEntry.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Work entry not found' });

    const qty = quantity !== undefined ? parseFloat(quantity) : existing.quantity;
    const rate = ratePerPiece !== undefined ? parseFloat(ratePerPiece) : existing.ratePerPiece;
    const totalCost = Math.round(qty * rate * 100) / 100;

    const entry = await prisma.outsourceWorkEntry.update({
      where: { id: parseInt(id) },
      data: {
        ...(workType && { workType }),
        ...(vendorName && { vendorName }),
        quantity: qty,
        ratePerPiece: rate,
        totalCost,
        ...(workDate && { workDate: new Date(workDate) }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });
    return res.json({ message: 'Work entry updated', entry });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update work entry', details: err.message });
  }
};

const deleteWorkEntry = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.outsourceWorkEntry.delete({ where: { id: parseInt(id) } });
    return res.json({ message: 'Work entry deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete work entry', details: err.message });
  }
};

// ── Vendor Payments ──────────────────────────────────────

const getVendorPayments = async (req, res) => {
  try {
    const { jobId } = req.params;
    const payments = await prisma.outsourceVendorPayment.findMany({
      where: { jobId: parseInt(jobId) },
      include: {
        account: { select: { id: true, name: true } },
      },
      orderBy: { paymentDate: 'desc' },
    });
    return res.json({ payments });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch vendor payments', details: err.message });
  }
};

const createVendorPayment = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { vendorName, amount, type, accountId, paymentDate, notes } = req.body;

    if (!vendorName || !amount || !accountId) {
      return res.status(400).json({ error: 'vendorName, amount, and accountId are required' });
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const [payment, job] = await Promise.all([
      prisma.outsourceVendorPayment.create({
        data: {
          jobId: parseInt(jobId),
          vendorName: vendorName.trim(),
          amount: paymentAmount,
          type: type === 'advance' ? 'advance' : 'payment',
          accountId: parseInt(accountId),
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          notes: notes || null,
        },
        include: {
          account: { select: { id: true, name: true } },
        },
      }),
      prisma.productionJob.findUnique({ where: { id: parseInt(jobId) }, select: { collection: true } }),
    ]);
    notifyVendorPayment(vendorName.trim(), paymentAmount, type === 'advance' ? 'advance' : 'payment', job?.collection || '', payment.account?.name || '', payment.account?.id, notes || null).catch(() => {});
    return res.status(201).json({ message: 'Vendor payment recorded', payment });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to record vendor payment', details: err.message });
  }
};

const deleteVendorPayment = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.outsourceVendorPayment.delete({ where: { id: parseInt(id) } });
    return res.json({ message: 'Vendor payment deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete vendor payment', details: err.message });
  }
};

// ── Vendor Ledger (cross-job) ─────────────────────────────

const getVendorLedger = async (req, res) => {
  try {
    const [allEntries, allPayments] = await Promise.all([
      prisma.outsourceWorkEntry.findMany({
        include: {
          job: { select: { id: true, collection: true, status: true } },
        },
        orderBy: { workDate: 'desc' },
      }),
      prisma.outsourceVendorPayment.findMany({
        include: {
          job: { select: { id: true, collection: true, status: true } },
          account: { select: { id: true, name: true } },
        },
        orderBy: { paymentDate: 'desc' },
      }),
    ]);

    // Build per-vendor map with per-job breakdown
    const vendorMap = {};

    for (const entry of allEntries) {
      const key = entry.vendorName.toLowerCase().trim();
      if (!vendorMap[key]) {
        vendorMap[key] = {
          vendorName: entry.vendorName,
          totalWork: 0,
          totalPaid: 0,
          totalAdvance: 0,
          jobs: {},
        };
      }
      vendorMap[key].totalWork += entry.totalCost;

      const jobKey = entry.job.id;
      if (!vendorMap[key].jobs[jobKey]) {
        vendorMap[key].jobs[jobKey] = {
          jobId: entry.job.id,
          collection: entry.job.collection,
          status: entry.job.status,
          totalWork: 0,
          totalPaid: 0,
          totalAdvance: 0,
        };
      }
      vendorMap[key].jobs[jobKey].totalWork += entry.totalCost;
    }

    for (const payment of allPayments) {
      const key = payment.vendorName.toLowerCase().trim();
      if (!vendorMap[key]) {
        vendorMap[key] = {
          vendorName: payment.vendorName,
          totalWork: 0,
          totalPaid: 0,
          totalAdvance: 0,
          jobs: {},
        };
      }
      if (payment.type === 'advance') {
        vendorMap[key].totalAdvance += payment.amount;
      } else {
        vendorMap[key].totalPaid += payment.amount;
      }

      const jobKey = payment.job.id;
      if (!vendorMap[key].jobs[jobKey]) {
        vendorMap[key].jobs[jobKey] = {
          jobId: payment.job.id,
          collection: payment.job.collection,
          status: payment.job.status,
          totalWork: 0,
          totalPaid: 0,
          totalAdvance: 0,
        };
      }
      if (payment.type === 'advance') {
        vendorMap[key].jobs[jobKey].totalAdvance += payment.amount;
      } else {
        vendorMap[key].jobs[jobKey].totalPaid += payment.amount;
      }
    }

    const vendors = Object.values(vendorMap).map(v => {
      const totalReceived = v.totalPaid + v.totalAdvance;
      const balance = v.totalWork - totalReceived;
      const jobBreakdown = Object.values(v.jobs).map(j => ({
        ...j,
        totalReceived: j.totalPaid + j.totalAdvance,
        balance: j.totalWork - (j.totalPaid + j.totalAdvance),
      })).sort((a, b) => b.balance - a.balance);
      return {
        vendorName: v.vendorName,
        totalWork: v.totalWork,
        totalPaid: v.totalPaid,
        totalAdvance: v.totalAdvance,
        totalReceived,
        balance,
        jobs: jobBreakdown,
      };
    });

    // Sort: outstanding balance first, then by vendor name
    vendors.sort((a, b) => {
      if (b.balance !== a.balance) return b.balance - a.balance;
      return a.vendorName.localeCompare(b.vendorName);
    });

    return res.json({ vendors });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch vendor ledger', details: err.message });
  }
};

// ── Collections List (for autocomplete) ─────────────────

const getCollections = async (req, res) => {
  try {
    const [articles, jobs] = await Promise.all([
      prisma.article.findMany({ select: { collection: true }, distinct: ['collection'] }),
      prisma.productionJob.findMany({ select: { collection: true }, distinct: ['collection'] }),
    ]);
    const set = new Set([
      ...articles.map(a => a.collection),
      ...jobs.map(j => j.collection),
    ]);
    return res.json({ collections: Array.from(set).filter(Boolean).sort() });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch collections', details: err.message });
  }
};

module.exports = {
  getJobs, getJob, createJob, updateJob, deleteJob,
  getWorkEntries, createWorkEntry, updateWorkEntry, deleteWorkEntry,
  getVendorPayments, createVendorPayment, deleteVendorPayment,
  getCollections, getVendorLedger,
};
