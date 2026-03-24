const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateSku } = require('../utils/skuGenerator');
const { logActivity } = require('./activityLogController');

function generateBarcode() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ZW${timestamp}${random}`;
}

const createVariant = async (req, res) => {
  try {
    const { sku, barcode, size, type, color, articleId, quantity } = req.body;

    if (!size || !type || !color || !articleId) {
      return res.status(400).json({ error: 'All fields are required: size, type, color, articleId' });
    }

    const article = await prisma.article.findUnique({
      where: { id: parseInt(articleId) },
    });

    if (!article || !article.isActive) {
      return res.status(404).json({ error: 'Article not found or inactive' });
    }

    let finalSku = sku;

    if (finalSku) {
      const existingSku = await prisma.variant.findUnique({
        where: { sku: finalSku },
      });

      if (existingSku) {
        return res.status(409).json({ error: 'SKU already exists' });
      }
    } else {
      finalSku = await generateSku(article.name, color, size);
    }

    let finalBarcode = barcode || null;
    if (finalBarcode) {
      const existingBarcode = await prisma.variant.findUnique({
        where: { barcode: finalBarcode },
      });
      if (existingBarcode) {
        return res.status(409).json({ error: 'Barcode already exists' });
      }
    }

    const initialQty = quantity || 0;
    if (initialQty < 0) {
      return res.status(400).json({ error: 'Quantity cannot be negative' });
    }

    const variant = await prisma.$transaction(async (tx) => {
      const v = await tx.variant.create({
        data: {
          sku: finalSku,
          barcode: finalBarcode,
          size,
          type,
          color,
          quantity: initialQty,
          articleId: parseInt(articleId),
        },
      });

      if (initialQty > 0) {
        await tx.stockLedger.create({
          data: {
            sku: finalSku,
            movementType: 'IN',
            qty: initialQty,
            purpose: 'Initial stock',
          },
        });
      }

      return v;
    });

    if (req.user) {
      logActivity(req.user.id, 'CREATE', 'Variant', variant.id, `Created variant ${finalSku}`, req.ip);
    }

    return res.status(201).json({ message: 'Variant created successfully', variant });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create variant', details: err.message });
  }
};

const generateBarcodeForVariant = async (req, res) => {
  try {
    const { sku } = req.params;
    const variant = await prisma.variant.findUnique({ where: { sku } });
    if (!variant || !variant.isActive) {
      return res.status(404).json({ error: 'Variant not found' });
    }
    if (variant.barcode) {
      return res.status(200).json({ barcode: variant.barcode, message: 'Barcode already exists' });
    }
    let newBarcode = generateBarcode();
    let exists = await prisma.variant.findUnique({ where: { barcode: newBarcode } });
    while (exists) {
      newBarcode = generateBarcode();
      exists = await prisma.variant.findUnique({ where: { barcode: newBarcode } });
    }
    const updated = await prisma.variant.update({
      where: { sku },
      data: { barcode: newBarcode },
    });
    if (req.user) {
      logActivity(req.user.id, 'UPDATE', 'Variant', variant.id, `Generated barcode ${newBarcode} for ${sku}`, req.ip);
    }
    return res.status(200).json({ barcode: updated.barcode, message: 'Barcode generated successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate barcode', details: err.message });
  }
};

const getVariantByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    const variant = await prisma.variant.findUnique({
      where: { barcode },
      include: { article: true, images: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!variant || !variant.isActive) {
      return res.status(404).json({ error: 'Variant not found for this barcode' });
    }
    return res.status(200).json({ variant });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch variant by barcode', details: err.message });
  }
};

const getAllVariants = async (req, res) => {
  try {
    const { search, sku, size, type, color, articleId, dateFrom, dateTo } = req.query;
    const where = { isActive: true };

    if (search) {
      where.OR = [
        { sku: { contains: search } },
        { barcode: { contains: search } },
        { color: { contains: search } },
        { article: { is: { name: { contains: search } } } },
      ];
    }
    if (sku) {
      where.sku = { contains: sku };
    }
    if (size) {
      where.size = size;
    }
    if (type) {
      where.type = { contains: type };
    }
    if (color) {
      where.color = { contains: color };
    }
    if (articleId) {
      where.articleId = parseInt(articleId);
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const variants = await prisma.variant.findMany({
      where,
      include: { article: true, images: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ variants });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch variants', details: err.message });
  }
};

const getVariantBySku = async (req, res) => {
  try {
    const { sku } = req.params;

    const variant = await prisma.variant.findUnique({
      where: { sku },
      include: { article: true, images: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!variant || !variant.isActive) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    return res.status(200).json({ variant });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch variant', details: err.message });
  }
};

const updateVariant = async (req, res) => {
  try {
    const { sku } = req.params;
    const { size, type, color, quantity } = req.body;

    const existing = await prisma.variant.findUnique({
      where: { sku },
    });

    if (!existing || !existing.isActive) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    const { barcode } = req.body;
    if (barcode !== undefined && barcode !== null && barcode !== '') {
      const barcodeExists = await prisma.variant.findFirst({
        where: { barcode, NOT: { sku } },
      });
      if (barcodeExists) {
        return res.status(409).json({ error: 'Barcode already in use by another variant' });
      }
    }

    const variant = await prisma.variant.update({
      where: { sku },
      data: {
        ...(size && { size }),
        ...(type && { type }),
        ...(color && { color }),
        ...(quantity !== undefined && { quantity }),
        ...(barcode !== undefined && { barcode: barcode || null }),
      },
    });

    if (req.user) {
      logActivity(req.user.id, 'UPDATE', 'Variant', variant.id, `Updated variant ${sku}`, req.ip);
    }

    return res.status(200).json({ message: 'Variant updated successfully', variant });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update variant', details: err.message });
  }
};

const deleteVariant = async (req, res) => {
  try {
    const { sku } = req.params;

    const existing = await prisma.variant.findUnique({
      where: { sku },
    });

    if (!existing || !existing.isActive) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    await prisma.variant.update({
      where: { sku },
      data: { isActive: false },
    });

    if (req.user) {
      logActivity(req.user.id, 'DELETE', 'Variant', existing.id, `Deleted variant ${sku}`, req.ip);
    }

    return res.status(200).json({ message: 'Variant deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete variant', details: err.message });
  }
};

module.exports = {
  createVariant,
  getAllVariants,
  getVariantBySku,
  getVariantByBarcode,
  updateVariant,
  deleteVariant,
  generateBarcodeForVariant,
};
