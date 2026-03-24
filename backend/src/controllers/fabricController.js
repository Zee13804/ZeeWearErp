const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logActivity } = require('./activityLogController');

const createFabric = async (req, res) => {
  try {
    const { name, type, color, season, meters, imageUrl } = req.body;

    if (!name || !type || !color) {
      return res.status(400).json({ error: 'All fields are required: name, type, color' });
    }

    const initialMeters = meters || 0;
    if (initialMeters < 0) {
      return res.status(400).json({ error: 'Meters cannot be negative' });
    }

    const fabric = await prisma.$transaction(async (tx) => {
      const f = await tx.fabric.create({
        data: {
          name,
          type,
          color,
          season: season || null,
          meters: initialMeters,
          imageUrl: imageUrl || null,
        },
      });

      if (initialMeters > 0) {
        await tx.fabricLedger.create({
          data: {
            fabricId: f.id,
            movementType: 'IN',
            meters: initialMeters,
            purpose: 'Initial stock',
          },
        });
      }

      return f;
    });

    if (req.user) {
      logActivity(req.user.id, 'CREATE', 'Fabric', fabric.id, `Created fabric: ${name}`, req.ip);
    }

    return res.status(201).json({ message: 'Fabric created successfully', fabric });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create fabric', details: err.message });
  }
};

const getAllFabrics = async (req, res) => {
  try {
    const { search, type, color, season, dateFrom, dateTo } = req.query;
    const where = { isActive: true };

    if (search) {
      where.name = { contains: search };
    }
    if (type) {
      where.type = { contains: type };
    }
    if (color) {
      where.color = { contains: color };
    }
    if (season) {
      where.season = season;
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const fabrics = await prisma.fabric.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ fabrics });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch fabrics', details: err.message });
  }
};

const fabricIn = async (req, res) => {
  try {
    const { fabricId, meters, purpose, note } = req.body;

    if (!fabricId) {
      return res.status(400).json({ error: 'fabricId is required' });
    }
    if (!purpose) {
      return res.status(400).json({ error: 'Purpose is required' });
    }
    if (typeof meters !== 'number' || meters <= 0) {
      return res.status(400).json({ error: 'Meters must be a positive number' });
    }

    const fabric = await prisma.fabric.findUnique({ where: { id: parseInt(fabricId) } });

    if (!fabric || !fabric.isActive) {
      return res.status(404).json({ error: 'Active fabric not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedFabric = await tx.fabric.update({
        where: { id: parseInt(fabricId) },
        data: { meters: fabric.meters + meters },
      });

      const ledgerEntry = await tx.fabricLedger.create({
        data: {
          fabricId: parseInt(fabricId),
          movementType: 'IN',
          meters,
          purpose,
          ...(note && { note: note.trim() }),
        },
      });

      return { updatedFabric, ledgerEntry };
    });

    if (req.user) {
      logActivity(req.user.id, 'FABRIC_IN', 'Fabric', fabric.id, `+${meters}m (${purpose})`, req.ip);
    }

    return res.status(200).json({
      message: 'Fabric IN recorded successfully',
      meters: result.updatedFabric.meters,
      ledgerEntry: result.ledgerEntry,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to process fabric in', details: err.message });
  }
};

const fabricOut = async (req, res) => {
  try {
    const { fabricId, meters, purpose, note } = req.body;

    if (!fabricId) {
      return res.status(400).json({ error: 'fabricId is required' });
    }
    if (!purpose) {
      return res.status(400).json({ error: 'Purpose is required' });
    }
    if (typeof meters !== 'number' || meters <= 0) {
      return res.status(400).json({ error: 'Meters must be a positive number' });
    }

    const fabric = await prisma.fabric.findUnique({ where: { id: parseInt(fabricId) } });

    if (!fabric || !fabric.isActive) {
      return res.status(404).json({ error: 'Active fabric not found' });
    }

    if (fabric.meters < meters) {
      return res.status(400).json({
        error: 'Insufficient fabric stock. Cannot go below zero.',
        available: fabric.meters,
        requested: meters,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newMeters = fabric.meters - meters;

      if (newMeters < 0) {
        throw new Error('Fabric stock cannot go below zero');
      }

      const updatedFabric = await tx.fabric.update({
        where: { id: parseInt(fabricId) },
        data: { meters: newMeters },
      });

      const ledgerEntry = await tx.fabricLedger.create({
        data: {
          fabricId: parseInt(fabricId),
          movementType: 'OUT',
          meters,
          purpose,
          ...(note && { note: note.trim() }),
        },
      });

      return { updatedFabric, ledgerEntry };
    });

    if (req.user) {
      logActivity(req.user.id, 'FABRIC_OUT', 'Fabric', fabric.id, `-${meters}m (${purpose})`, req.ip);
    }

    return res.status(200).json({
      message: 'Fabric OUT recorded successfully',
      meters: result.updatedFabric.meters,
      ledgerEntry: result.ledgerEntry,
    });
  } catch (err) {
    if (err.message === 'Fabric stock cannot go below zero') {
      return res.status(400).json({ error: 'Fabric stock cannot go below zero' });
    }
    return res.status(500).json({ error: 'Failed to process fabric out', details: err.message });
  }
};

const getFabricMovements = async (req, res) => {
  try {
    const { fabricId, movementType, dateFrom, dateTo, limit: queryLimit } = req.query;
    const where = {};

    if (fabricId) where.fabricId = parseInt(fabricId);
    if (movementType) where.movementType = movementType;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const take = Math.min(parseInt(queryLimit) || 100, 500);

    const movements = await prisma.fabricLedger.findMany({
      where,
      include: { fabric: { select: { id: true, name: true, type: true, color: true } } },
      orderBy: { createdAt: 'desc' },
      take,
    });

    return res.status(200).json({ movements, count: movements.length });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch fabric movements', details: err.message });
  }
};

const updateFabric = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, color, season } = req.body;

    const existing = await prisma.fabric.findUnique({ where: { id: parseInt(id) } });
    if (!existing || !existing.isActive) {
      return res.status(404).json({ error: 'Fabric not found' });
    }

    const fabric = await prisma.fabric.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(color && { color }),
        ...(season !== undefined && { season: season || null }),
      },
    });

    if (req.user) {
      logActivity(req.user.id, 'UPDATE', 'Fabric', fabric.id, `Updated fabric: ${fabric.name}`, req.ip);
    }

    return res.status(200).json({ message: 'Fabric updated successfully', fabric });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update fabric', details: err.message });
  }
};

const deleteFabric = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.fabric.findUnique({ where: { id: parseInt(id) } });
    if (!existing || !existing.isActive) {
      return res.status(404).json({ error: 'Fabric not found' });
    }

    await prisma.fabric.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    if (req.user) {
      logActivity(req.user.id, 'DELETE', 'Fabric', existing.id, `Deleted fabric: ${existing.name}`, req.ip);
    }

    return res.status(200).json({ message: 'Fabric deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete fabric', details: err.message });
  }
};

const uploadFabricImage = async (req, res) => {
  try {
    const { id } = req.params;
    const fabric = await prisma.fabric.findUnique({ where: { id: parseInt(id) } });
    if (!fabric || !fabric.isActive) {
      return res.status(404).json({ error: 'Fabric not found' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    const updated = await prisma.fabric.update({
      where: { id: parseInt(id) },
      data: { imageUrl },
    });
    if (req.user) {
      logActivity(req.user.id, 'UPLOAD_IMAGE', 'Fabric', fabric.id, `Uploaded image for fabric: ${fabric.name}`, req.ip);
    }
    return res.status(200).json({ message: 'Image uploaded successfully', fabric: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to upload image', details: err.message });
  }
};

const deleteFabricImage = async (req, res) => {
  try {
    const { id } = req.params;
    const fabric = await prisma.fabric.findUnique({ where: { id: parseInt(id) } });
    if (!fabric || !fabric.isActive) {
      return res.status(404).json({ error: 'Fabric not found' });
    }
    const updated = await prisma.fabric.update({
      where: { id: parseInt(id) },
      data: { imageUrl: null },
    });
    if (req.user) {
      logActivity(req.user.id, 'DELETE_IMAGE', 'Fabric', fabric.id, `Removed image from fabric: ${fabric.name}`, req.ip);
    }
    return res.status(200).json({ message: 'Image removed successfully', fabric: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to remove image', details: err.message });
  }
};

module.exports = { createFabric, getAllFabrics, fabricIn, fabricOut, getFabricMovements, updateFabric, deleteFabric, uploadFabricImage, deleteFabricImage };
