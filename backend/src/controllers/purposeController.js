const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getPurposes = async (req, res) => {
  try {
    const { type } = req.query;
    const where = { isActive: true };
    if (type) where.type = type;

    const purposes = await prisma.purpose.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({ purposes });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch purposes', details: err.message });
  }
};

const createPurpose = async (req, res) => {
  try {
    const { name, type } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Purpose name is required' });
    }

    const existing = await prisma.purpose.findUnique({ where: { name: name.trim() } });
    if (existing) {
      if (!existing.isActive) {
        const reactivated = await prisma.purpose.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
        return res.status(200).json({ message: 'Purpose reactivated', purpose: reactivated });
      }
      return res.status(400).json({ error: 'Purpose already exists' });
    }

    const purpose = await prisma.purpose.create({
      data: {
        name: name.trim(),
        type: type || 'general',
      },
    });

    return res.status(201).json({ message: 'Purpose created', purpose });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create purpose', details: err.message });
  }
};

const deletePurpose = async (req, res) => {
  try {
    const { id } = req.params;

    const purpose = await prisma.purpose.findUnique({ where: { id: parseInt(id) } });
    if (!purpose) {
      return res.status(404).json({ error: 'Purpose not found' });
    }

    await prisma.purpose.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    return res.status(200).json({ message: 'Purpose deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete purpose', details: err.message });
  }
};

module.exports = { getPurposes, createPurpose, deletePurpose };
