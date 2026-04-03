const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
      return {
        ...job,
        totalOutsourceCost,
        totalMaterialCost,
        grandTotal: totalOutsourceCost + totalMaterialCost,
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
            include: {
              account: { select: { id: true, name: true } },
            },
            orderBy: { workDate: 'desc' },
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

    return res.json({
      job: {
        ...job,
        totalOutsourceCost,
        totalMaterialCost,
        grandTotal: totalOutsourceCost + totalMaterialCost,
        linkedPurchases,
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
      include: {
        account: { select: { id: true, name: true } },
      },
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
    const { workType, vendorName, quantity, ratePerPiece, accountId, workDate, notes } = req.body;

    if (!workType || !vendorName || !accountId) {
      return res.status(400).json({ error: 'workType, vendorName and accountId are required' });
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
        accountId: parseInt(accountId),
        workDate: workDate ? new Date(workDate) : new Date(),
        notes: notes || null,
      },
      include: {
        account: { select: { id: true, name: true } },
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
    const { workType, vendorName, quantity, ratePerPiece, accountId, workDate, notes } = req.body;

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
        ...(accountId && { accountId: parseInt(accountId) }),
        ...(workDate && { workDate: new Date(workDate) }),
        ...(notes !== undefined && { notes: notes || null }),
      },
      include: { account: { select: { id: true, name: true } } },
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
  getCollections,
};
