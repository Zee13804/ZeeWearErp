const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const logActivity = async (userId, action, entity, entityId, details, ipAddress) => {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: entityId || null,
        details: details || null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
};

const getActivityLogs = async (req, res) => {
  try {
    const { entity, action, userId, limit: queryLimit } = req.query;
    const where = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (userId) where.userId = parseInt(userId);

    const take = Math.min(parseInt(queryLimit) || 50, 200);

    const logs = await prisma.activityLog.findMany({
      where,
      include: { user: { select: { id: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take,
    });

    return res.status(200).json({ logs });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch activity logs', details: err.message });
  }
};

const getRecentActivity = async (req, res) => {
  try {
    const logs = await prisma.activityLog.findMany({
      include: { user: { select: { id: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return res.status(200).json({ logs });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch recent activity', details: err.message });
  }
};

module.exports = { logActivity, getActivityLogs, getRecentActivity };
