const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logActivity } = require('./activityLogController');

const createAccessory = async (req, res) => {
  try {
    const { name, category, unit, quantity, imageUrl } = req.body;

    if (!name || !category || !unit) {
      return res.status(400).json({ error: 'All fields are required: name, category, unit' });
    }

    const initialQty = quantity || 0;
    if (initialQty < 0) {
      return res.status(400).json({ error: 'Quantity cannot be negative' });
    }

    const accessory = await prisma.$transaction(async (tx) => {
      const a = await tx.accessory.create({
        data: {
          name,
          category,
          unit,
          quantity: initialQty,
          imageUrl: imageUrl || null,
        },
      });

      if (initialQty > 0) {
        await tx.accessoryLedger.create({
          data: {
            accessoryId: a.id,
            movementType: 'IN',
            quantity: initialQty,
            purpose: 'Initial stock',
          },
        });
      }

      return a;
    });

    if (req.user) {
      logActivity(req.user.id, 'CREATE', 'Accessory', accessory.id, `Created accessory: ${name}`, req.ip);
    }

    return res.status(201).json({ message: 'Accessory created successfully', accessory });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create accessory', details: err.message });
  }
};

const getAllAccessories = async (req, res) => {
  try {
    const { search, category, unit, dateFrom, dateTo } = req.query;
    const where = { isActive: true };

    if (search) {
      where.name = { contains: search };
    }
    if (category) {
      where.category = { contains: category };
    }
    if (unit) {
      where.unit = unit;
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const accessories = await prisma.accessory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ accessories });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch accessories', details: err.message });
  }
};

const accessoryIn = async (req, res) => {
  try {
    const { accessoryId, quantity, purpose, note } = req.body;

    if (!accessoryId) {
      return res.status(400).json({ error: 'accessoryId is required' });
    }
    if (!purpose) {
      return res.status(400).json({ error: 'Purpose is required' });
    }
    if (typeof quantity !== 'number' || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number' });
    }

    const accessory = await prisma.accessory.findUnique({ where: { id: parseInt(accessoryId) } });

    if (!accessory || !accessory.isActive) {
      return res.status(404).json({ error: 'Active accessory not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedAccessory = await tx.accessory.update({
        where: { id: parseInt(accessoryId) },
        data: { quantity: accessory.quantity + quantity },
      });

      const ledgerEntry = await tx.accessoryLedger.create({
        data: {
          accessoryId: parseInt(accessoryId),
          movementType: 'IN',
          quantity,
          purpose,
          ...(note && { note: note.trim() }),
        },
      });

      return { updatedAccessory, ledgerEntry };
    });

    if (req.user) {
      logActivity(req.user.id, 'ACCESSORY_IN', 'Accessory', accessory.id, `+${quantity} ${accessory.unit} (${purpose})`, req.ip);
    }

    return res.status(200).json({
      message: 'Accessory IN recorded successfully',
      quantity: result.updatedAccessory.quantity,
      unit: result.updatedAccessory.unit,
      ledgerEntry: result.ledgerEntry,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to process accessory in', details: err.message });
  }
};

const accessoryOut = async (req, res) => {
  try {
    const { accessoryId, quantity, purpose, note } = req.body;

    if (!accessoryId) {
      return res.status(400).json({ error: 'accessoryId is required' });
    }
    if (!purpose) {
      return res.status(400).json({ error: 'Purpose is required' });
    }
    if (typeof quantity !== 'number' || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number' });
    }

    const accessory = await prisma.accessory.findUnique({ where: { id: parseInt(accessoryId) } });

    if (!accessory || !accessory.isActive) {
      return res.status(404).json({ error: 'Active accessory not found' });
    }

    if (accessory.quantity < quantity) {
      return res.status(400).json({
        error: 'Insufficient accessory stock. Cannot go below zero.',
        available: accessory.quantity,
        requested: quantity,
        unit: accessory.unit,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newQuantity = accessory.quantity - quantity;

      if (newQuantity < 0) {
        throw new Error('Accessory stock cannot go below zero');
      }

      const updatedAccessory = await tx.accessory.update({
        where: { id: parseInt(accessoryId) },
        data: { quantity: newQuantity },
      });

      const ledgerEntry = await tx.accessoryLedger.create({
        data: {
          accessoryId: parseInt(accessoryId),
          movementType: 'OUT',
          quantity,
          purpose,
          ...(note && { note: note.trim() }),
        },
      });

      return { updatedAccessory, ledgerEntry };
    });

    if (req.user) {
      logActivity(req.user.id, 'ACCESSORY_OUT', 'Accessory', accessory.id, `-${quantity} ${accessory.unit} (${purpose})`, req.ip);
    }

    return res.status(200).json({
      message: 'Accessory OUT recorded successfully',
      quantity: result.updatedAccessory.quantity,
      unit: result.updatedAccessory.unit,
      ledgerEntry: result.ledgerEntry,
    });
  } catch (err) {
    if (err.message === 'Accessory stock cannot go below zero') {
      return res.status(400).json({ error: 'Accessory stock cannot go below zero' });
    }
    return res.status(500).json({ error: 'Failed to process accessory out', details: err.message });
  }
};

const getAccessoryMovements = async (req, res) => {
  try {
    const { accessoryId, movementType, dateFrom, dateTo, limit: queryLimit } = req.query;
    const where = {};

    if (accessoryId) where.accessoryId = parseInt(accessoryId);
    if (movementType) where.movementType = movementType;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const take = Math.min(parseInt(queryLimit) || 100, 500);

    const movements = await prisma.accessoryLedger.findMany({
      where,
      include: { accessory: { select: { id: true, name: true, category: true, unit: true } } },
      orderBy: { createdAt: 'desc' },
      take,
    });

    return res.status(200).json({ movements, count: movements.length });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch accessory movements', details: err.message });
  }
};

const updateAccessory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, unit } = req.body;

    const existing = await prisma.accessory.findUnique({ where: { id: parseInt(id) } });
    if (!existing || !existing.isActive) {
      return res.status(404).json({ error: 'Accessory not found' });
    }

    const accessory = await prisma.accessory.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(unit && { unit }),
      },
    });

    if (req.user) {
      logActivity(req.user.id, 'UPDATE', 'Accessory', accessory.id, `Updated accessory: ${accessory.name}`, req.ip);
    }

    return res.status(200).json({ message: 'Accessory updated successfully', accessory });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update accessory', details: err.message });
  }
};

const deleteAccessory = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.accessory.findUnique({ where: { id: parseInt(id) } });
    if (!existing || !existing.isActive) {
      return res.status(404).json({ error: 'Accessory not found' });
    }

    await prisma.accessory.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    if (req.user) {
      logActivity(req.user.id, 'DELETE', 'Accessory', existing.id, `Deleted accessory: ${existing.name}`, req.ip);
    }

    return res.status(200).json({ message: 'Accessory deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete accessory', details: err.message });
  }
};

const uploadAccessoryImage = async (req, res) => {
  try {
    const { id } = req.params;
    const accessory = await prisma.accessory.findUnique({ where: { id: parseInt(id) } });
    if (!accessory || !accessory.isActive) {
      return res.status(404).json({ error: 'Accessory not found' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    const updated = await prisma.accessory.update({
      where: { id: parseInt(id) },
      data: { imageUrl },
    });
    if (req.user) {
      logActivity(req.user.id, 'UPLOAD_IMAGE', 'Accessory', accessory.id, `Uploaded image for accessory: ${accessory.name}`, req.ip);
    }
    return res.status(200).json({ message: 'Image uploaded successfully', accessory: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to upload image', details: err.message });
  }
};

const deleteAccessoryImage = async (req, res) => {
  try {
    const { id } = req.params;
    const accessory = await prisma.accessory.findUnique({ where: { id: parseInt(id) } });
    if (!accessory || !accessory.isActive) {
      return res.status(404).json({ error: 'Accessory not found' });
    }
    const updated = await prisma.accessory.update({
      where: { id: parseInt(id) },
      data: { imageUrl: null },
    });
    if (req.user) {
      logActivity(req.user.id, 'DELETE_IMAGE', 'Accessory', accessory.id, `Removed image from accessory: ${accessory.name}`, req.ip);
    }
    return res.status(200).json({ message: 'Image removed successfully', accessory: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to remove image', details: err.message });
  }
};

module.exports = { createAccessory, getAllAccessories, accessoryIn, accessoryOut, getAccessoryMovements, updateAccessory, deleteAccessory, uploadAccessoryImage, deleteAccessoryImage };
