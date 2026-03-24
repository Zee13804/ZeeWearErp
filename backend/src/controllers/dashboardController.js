const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getDashboardStats = async (req, res) => {
  try {
    const [
      articleCount,
      variantCount,
      fabricCount,
      accessoryCount,
      variants,
      fabrics,
      accessories,
      recentMovements,
      recentActivity,
      purposeMovements,
    ] = await Promise.all([
      prisma.article.count({ where: { isActive: true } }),
      prisma.variant.count({ where: { isActive: true } }),
      prisma.fabric.count({ where: { isActive: true } }),
      prisma.accessory.count({ where: { isActive: true } }),
      prisma.variant.findMany({ where: { isActive: true }, select: { sku: true, quantity: true, size: true, color: true, articleId: true, article: { select: { name: true } } } }),
      prisma.fabric.findMany({ where: { isActive: true }, select: { name: true, meters: true } }),
      prisma.accessory.findMany({ where: { isActive: true }, select: { name: true, quantity: true, unit: true } }),
      prisma.stockLedger.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.activityLog.findMany({
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
      prisma.stockLedger.findMany({ select: { purpose: true, movementType: true, qty: true } }),
    ]);

    const totalPieces = variants.reduce((sum, v) => sum + v.quantity, 0);
    const totalFabricMeters = fabrics.reduce((sum, f) => sum + f.meters, 0);
    const lowStockVariants = variants.filter(v => v.quantity <= 5).map(v => ({
      sku: v.sku,
      article: v.article?.name || '-',
      size: v.size,
      color: v.color,
      quantity: v.quantity,
    }));

    const purposeBreakdown = {};
    purposeMovements.forEach(m => {
      if (!purposeBreakdown[m.purpose]) {
        purposeBreakdown[m.purpose] = { purpose: m.purpose, totalIn: 0, totalOut: 0 };
      }
      if (m.movementType === 'IN') purposeBreakdown[m.purpose].totalIn += m.qty;
      else purposeBreakdown[m.purpose].totalOut += m.qty;
    });
    const purposeData = Object.values(purposeBreakdown).sort((a, b) => (b.totalIn + b.totalOut) - (a.totalIn + a.totalOut));

    return res.status(200).json({
      counts: { articles: articleCount, variants: variantCount, fabrics: fabricCount, accessories: accessoryCount },
      inventory: { totalPieces, totalFabricMeters: Math.round(totalFabricMeters * 100) / 100, lowStockCount: lowStockVariants.length },
      lowStockVariants: lowStockVariants.slice(0, 10),
      purposeBreakdown: purposeData,
      recentMovements: recentMovements.map(m => ({
        id: m.id,
        sku: m.sku,
        type: m.movementType,
        qty: m.qty,
        purpose: m.purpose,
        destination: m.destination,
        date: m.createdAt,
      })),
      recentActivity: recentActivity.map(a => ({
        id: a.id,
        action: a.action,
        entity: a.entity,
        details: a.details,
        user: a.user?.email || '-',
        date: a.createdAt,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load dashboard', details: err.message });
  }
};

module.exports = { getDashboardStats };
