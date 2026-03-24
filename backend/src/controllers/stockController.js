const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logActivity } = require('./activityLogController');

const stockIn = async (req, res) => {
  try {
    const { sku, qty, purpose, note, destination, reference } = req.body;

    if (!sku) {
      return res.status(400).json({ error: 'SKU is required' });
    }
    if (!purpose) {
      return res.status(400).json({ error: 'Purpose is required' });
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive integer' });
    }

    const variant = await prisma.variant.findUnique({ where: { sku } });

    if (!variant || !variant.isActive) {
      return res.status(404).json({ error: 'Active variant not found for this SKU' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedVariant = await tx.variant.update({
        where: { sku },
        data: { quantity: variant.quantity + qty },
      });

      const ledgerEntry = await tx.stockLedger.create({
        data: {
          sku,
          movementType: 'IN',
          qty,
          purpose,
          note: note || null,
          destination: destination || null,
          reference: reference || null,
        },
      });

      return { updatedVariant, ledgerEntry };
    });

    if (req.user) {
      logActivity(req.user.id, 'STOCK_IN', 'Variant', variant.id, `+${qty} units (${purpose})`, req.ip);
    }

    return res.status(200).json({
      message: 'Stock IN recorded successfully',
      quantity: result.updatedVariant.quantity,
      ledgerEntry: result.ledgerEntry,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to process stock in', details: err.message });
  }
};

const stockOut = async (req, res) => {
  try {
    const { sku, qty, purpose, note, destination, reference } = req.body;

    if (!sku) {
      return res.status(400).json({ error: 'SKU is required' });
    }
    if (!purpose) {
      return res.status(400).json({ error: 'Purpose is required' });
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive integer' });
    }

    const variant = await prisma.variant.findUnique({ where: { sku } });

    if (!variant || !variant.isActive) {
      return res.status(404).json({ error: 'Active variant not found for this SKU' });
    }

    if (variant.quantity < qty) {
      return res.status(400).json({
        error: 'Insufficient stock. Cannot go below zero.',
        available: variant.quantity,
        requested: qty,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newQuantity = variant.quantity - qty;

      if (newQuantity < 0) {
        throw new Error('Stock cannot go below zero');
      }

      const updatedVariant = await tx.variant.update({
        where: { sku },
        data: { quantity: newQuantity },
      });

      const ledgerEntry = await tx.stockLedger.create({
        data: {
          sku,
          movementType: 'OUT',
          qty,
          purpose,
          note: note || null,
          destination: destination || null,
          reference: reference || null,
        },
      });

      return { updatedVariant, ledgerEntry };
    });

    if (req.user) {
      logActivity(req.user.id, 'STOCK_OUT', 'Variant', variant.id, `-${qty} units (${purpose})${destination ? ' → ' + destination : ''}`, req.ip);
    }

    return res.status(200).json({
      message: 'Stock OUT recorded successfully',
      quantity: result.updatedVariant.quantity,
      ledgerEntry: result.ledgerEntry,
    });
  } catch (err) {
    if (err.message === 'Stock cannot go below zero') {
      return res.status(400).json({ error: 'Stock cannot go below zero' });
    }
    return res.status(500).json({ error: 'Failed to process stock out', details: err.message });
  }
};

const getStockMovements = async (req, res) => {
  try {
    const { sku, movementType, type, purpose, destination, dateFrom, dateTo, limit: queryLimit } = req.query;
    const where = {};

    if (sku) where.sku = { contains: sku };
    if (movementType || type) where.movementType = movementType || type;
    if (purpose) where.purpose = { contains: purpose };
    if (destination) where.destination = { contains: destination };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const take = Math.min(parseInt(queryLimit) || 100, 500);

    const movements = await prisma.stockLedger.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });

    const skus = [...new Set(movements.map(m => m.sku))];
    const variants = await prisma.variant.findMany({
      where: { sku: { in: skus } },
      select: { sku: true, size: true, color: true, type: true, article: { select: { id: true, name: true } } },
    });
    const variantMap = {};
    for (const v of variants) {
      variantMap[v.sku] = { size: v.size, color: v.color, type: v.type, article: v.article };
    }

    const enrichedMovements = movements.map(m => ({
      ...m,
      variant: variantMap[m.sku] || null,
    }));

    return res.status(200).json({ movements: enrichedMovements, count: enrichedMovements.length });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch stock movements', details: err.message });
  }
};

module.exports = { stockIn, stockOut, getStockMovements };
