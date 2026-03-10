const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const prisma = new PrismaClient();

const buildDateFilter = (dateFrom, dateTo) => {
  if (!dateFrom && !dateTo) return undefined;
  const filter = {};
  if (dateFrom) filter.gte = new Date(dateFrom);
  if (dateTo) {
    const d = new Date(dateTo);
    d.setHours(23, 59, 59, 999);
    filter.lte = d;
  }
  return filter;
};

const getStockReport = async (req, res) => {
  try {
    const { search, size, type, color, collection, season, fabric, dateFrom, dateTo } = req.query;
    const where = { isActive: true };
    const articleWhere = {};

    if (search) {
      where.OR = [
        { sku: { contains: search } },
        { barcode: { contains: search } },
        { color: { contains: search } },
        { article: { is: { name: { contains: search } } } },
      ];
    }
    if (size) where.size = size;
    if (type) where.type = type;
    if (color) where.color = color;
    if (collection) articleWhere.collection = collection;
    if (season) articleWhere.season = season;
    if (fabric) articleWhere.fabric = fabric;
    if (Object.keys(articleWhere).length > 0) {
      where.article = { is: articleWhere };
    }
    const dateFilter = buildDateFilter(dateFrom, dateTo);
    if (dateFilter) where.createdAt = dateFilter;

    const variants = await prisma.variant.findMany({
      where,
      include: {
        article: { select: { name: true, collection: true, fabric: true, season: true } },
        images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
      },
      orderBy: { sku: 'asc' },
    });

    const articleIds = [...new Set(variants.map(v => v.articleId))];
    const articleImages = await prisma.image.findMany({
      where: { articleId: { in: articleIds } },
      orderBy: { sortOrder: 'asc' },
    });
    const articleImageMap = {};
    articleImages.forEach(img => {
      if (!articleImageMap[img.articleId]) articleImageMap[img.articleId] = img.url;
    });

    const data = variants.map(v => ({
      imageUrl: v.images[0]?.url || articleImageMap[v.articleId] || '',
      sku: v.sku,
      barcode: v.barcode || '',
      articleName: v.article.name,
      collection: v.article.collection,
      fabric: v.article.fabric,
      season: v.article.season,
      size: v.size,
      type: v.type,
      color: v.color,
      quantity: v.quantity,
      createdAt: v.createdAt.toISOString().split('T')[0],
    }));

    const totalPieces = data.reduce((s, d) => s + d.quantity, 0);
    return res.json({ report: 'Stock Report', count: data.length, totalPieces, data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate stock report', details: err.message });
  }
};

const getMovementsReport = async (req, res) => {
  try {
    const { search, purpose, movementType, destination, dateFrom, dateTo } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { sku: { contains: search } },
        { reference: { contains: search } },
        { note: { contains: search } },
      ];
    }
    if (purpose) where.purpose = purpose;
    if (movementType) where.movementType = movementType;
    if (destination) where.destination = { contains: destination };
    const dateFilter = buildDateFilter(dateFrom, dateTo);
    if (dateFilter) where.createdAt = dateFilter;

    const movements = await prisma.stockLedger.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const skus = [...new Set(movements.map(m => m.sku))];
    const variants = await prisma.variant.findMany({
      where: { sku: { in: skus } },
      include: {
        images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
      },
    });
    const variantArticleIds = [...new Set(variants.map(v => v.articleId))];
    const artImages = await prisma.image.findMany({
      where: { articleId: { in: variantArticleIds } },
    });
    const artImgMap = {};
    artImages.forEach(img => { if (!artImgMap[img.articleId]) artImgMap[img.articleId] = img.url; });
    const skuImgMap = {};
    variants.forEach(v => { skuImgMap[v.sku] = v.images[0]?.url || artImgMap[v.articleId] || ''; });

    const data = movements.map(m => ({
      imageUrl: skuImgMap[m.sku] || '',
      sku: m.sku,
      movementType: m.movementType,
      qty: m.qty,
      purpose: m.purpose,
      destination: m.destination || '',
      reference: m.reference || '',
      note: m.note || '',
      createdAt: m.createdAt.toISOString().split('T')[0],
    }));

    const totalIn = data.filter(d => d.movementType === 'IN').reduce((s, d) => s + d.qty, 0);
    const totalOut = data.filter(d => d.movementType === 'OUT').reduce((s, d) => s + d.qty, 0);
    return res.json({ report: 'Stock Movements Report', count: data.length, totalIn, totalOut, data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate movements report', details: err.message });
  }
};

const getFabricReport = async (req, res) => {
  try {
    const { search, type, color, season, dateFrom, dateTo } = req.query;
    const where = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { color: { contains: search } },
      ];
    }
    if (type) where.type = type;
    if (color) where.color = color;
    if (season) where.season = season;
    const dateFilter = buildDateFilter(dateFrom, dateTo);
    if (dateFilter) where.createdAt = dateFilter;

    const fabrics = await prisma.fabric.findMany({ where, orderBy: { name: 'asc' } });

    const data = fabrics.map(f => ({
      imageUrl: f.imageUrl || '',
      name: f.name,
      type: f.type,
      color: f.color,
      season: f.season || '',
      meters: f.meters,
      createdAt: f.createdAt.toISOString().split('T')[0],
    }));

    const totalMeters = data.reduce((s, d) => s + d.meters, 0);
    return res.json({ report: 'Fabric Report', count: data.length, totalMeters: Math.round(totalMeters * 100) / 100, data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate fabric report', details: err.message });
  }
};

const getAccessoriesReport = async (req, res) => {
  try {
    const { search, category, unit, dateFrom, dateTo } = req.query;
    const where = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { category: { contains: search } },
      ];
    }
    if (category) where.category = category;
    if (unit) where.unit = unit;
    const dateFilter = buildDateFilter(dateFrom, dateTo);
    if (dateFilter) where.createdAt = dateFilter;

    const accessories = await prisma.accessory.findMany({ where, orderBy: { name: 'asc' } });

    const data = accessories.map(a => ({
      imageUrl: a.imageUrl || '',
      name: a.name,
      category: a.category,
      unit: a.unit,
      quantity: a.quantity,
      createdAt: a.createdAt.toISOString().split('T')[0],
    }));

    const totalQty = data.reduce((s, d) => s + d.quantity, 0);
    return res.json({ report: 'Accessories Report', count: data.length, totalQuantity: Math.round(totalQty * 100) / 100, data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate accessories report', details: err.message });
  }
};

const getPurposeReport = async (req, res) => {
  try {
    const { purpose, search, movementType, dateFrom, dateTo } = req.query;
    const where = {};

    if (purpose) where.purpose = purpose;
    if (search) {
      where.OR = [
        { sku: { contains: search } },
        { reference: { contains: search } },
      ];
    }
    if (movementType) where.movementType = movementType;
    const dateFilter = buildDateFilter(dateFrom, dateTo);
    if (dateFilter) where.createdAt = dateFilter;

    const movements = await prisma.stockLedger.findMany({ where, orderBy: { createdAt: 'desc' } });

    const purposeMap = {};
    movements.forEach((m) => {
      if (!purposeMap[m.purpose]) {
        purposeMap[m.purpose] = { purpose: m.purpose, totalIn: 0, totalOut: 0, movements: 0, skus: {} };
      }
      const p = purposeMap[m.purpose];
      p.movements++;
      if (m.movementType === 'IN') p.totalIn += m.qty;
      else p.totalOut += m.qty;
      if (!p.skus[m.sku]) p.skus[m.sku] = { sku: m.sku, in: 0, out: 0 };
      if (m.movementType === 'IN') p.skus[m.sku].in += m.qty;
      else p.skus[m.sku].out += m.qty;
    });

    const data = Object.values(purposeMap).map((p) => ({
      ...p,
      skus: Object.values(p.skus).sort((a, b) => (b.in + b.out) - (a.in + a.out)),
    }));

    return res.json({ report: 'Purpose-wise Stock Report', count: data.length, data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate purpose report', details: err.message });
  }
};

const getActivityReport = async (req, res) => {
  try {
    const { action, entity, search, dateFrom, dateTo } = req.query;
    const where = {};

    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (search) {
      where.OR = [
        { details: { contains: search } },
        { action: { contains: search } },
      ];
    }
    const dateFilter = buildDateFilter(dateFrom, dateTo);
    if (dateFilter) where.createdAt = dateFilter;

    const logs = await prisma.activityLog.findMany({
      where,
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const data = logs.map(l => ({
      userEmail: l.user.email,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId || '',
      details: l.details || '',
      createdAt: l.createdAt.toISOString().replace('T', ' ').slice(0, 19),
    }));

    return res.json({ report: 'Activity Log Report', count: data.length, data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate activity report', details: err.message });
  }
};

const getFabricMovementsReport = async (req, res) => {
  try {
    const { search, purpose, movementType, dateFrom, dateTo } = req.query;
    const where = {};

    if (purpose) where.purpose = purpose;
    if (movementType) where.movementType = movementType;
    const dateFilter = buildDateFilter(dateFrom, dateTo);
    if (dateFilter) where.createdAt = dateFilter;

    const includeWhere = {};
    if (search) {
      includeWhere.OR = [
        { name: { contains: search } },
        { color: { contains: search } },
      ];
    }

    const movements = await prisma.fabricLedger.findMany({
      where,
      include: { fabric: { select: { name: true, type: true, color: true } } },
      orderBy: { createdAt: 'desc' },
    });

    let filtered = movements;
    if (search) {
      const s = search.toLowerCase();
      filtered = movements.filter(m =>
        m.fabric.name.toLowerCase().includes(s) || m.fabric.color.toLowerCase().includes(s) || m.fabric.type.toLowerCase().includes(s)
      );
    }

    const data = filtered.map(m => ({
      fabricName: m.fabric.name,
      fabricType: m.fabric.type,
      fabricColor: m.fabric.color,
      movementType: m.movementType,
      meters: m.meters,
      purpose: m.purpose,
      note: m.note || '',
      createdAt: m.createdAt.toISOString().split('T')[0],
    }));

    const totalIn = data.filter(d => d.movementType === 'IN').reduce((s, d) => s + d.meters, 0);
    const totalOut = data.filter(d => d.movementType === 'OUT').reduce((s, d) => s + d.meters, 0);
    return res.json({ report: 'Fabric Movements Report', count: data.length, totalIn: Math.round(totalIn * 100) / 100, totalOut: Math.round(totalOut * 100) / 100, data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate fabric movements report', details: err.message });
  }
};

const getAccessoryMovementsReport = async (req, res) => {
  try {
    const { search, purpose, movementType, dateFrom, dateTo } = req.query;
    const where = {};

    if (purpose) where.purpose = purpose;
    if (movementType) where.movementType = movementType;
    const dateFilter = buildDateFilter(dateFrom, dateTo);
    if (dateFilter) where.createdAt = dateFilter;

    const movements = await prisma.accessoryLedger.findMany({
      where,
      include: { accessory: { select: { name: true, category: true, unit: true } } },
      orderBy: { createdAt: 'desc' },
    });

    let filtered = movements;
    if (search) {
      const s = search.toLowerCase();
      filtered = movements.filter(m =>
        m.accessory.name.toLowerCase().includes(s) || m.accessory.category.toLowerCase().includes(s)
      );
    }

    const data = filtered.map(m => ({
      accessoryName: m.accessory.name,
      category: m.accessory.category,
      unit: m.accessory.unit,
      movementType: m.movementType,
      quantity: m.quantity,
      purpose: m.purpose,
      note: m.note || '',
      createdAt: m.createdAt.toISOString().split('T')[0],
    }));

    const totalIn = data.filter(d => d.movementType === 'IN').reduce((s, d) => s + d.quantity, 0);
    const totalOut = data.filter(d => d.movementType === 'OUT').reduce((s, d) => s + d.quantity, 0);
    return res.json({ report: 'Accessory Movements Report', count: data.length, totalIn: Math.round(totalIn * 100) / 100, totalOut: Math.round(totalOut * 100) / 100, data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate accessory movements report', details: err.message });
  }
};

const getFilterOptions = async (req, res) => {
  try {
    const [variants, articles, fabrics, accessories, purposes, stockLedger] = await Promise.all([
      prisma.variant.findMany({ where: { isActive: true }, select: { size: true, type: true, color: true } }),
      prisma.article.findMany({ where: { isActive: true }, select: { collection: true, fabric: true, season: true } }),
      prisma.fabric.findMany({ where: { isActive: true }, select: { type: true, color: true, season: true } }),
      prisma.accessory.findMany({ where: { isActive: true }, select: { category: true, unit: true } }),
      prisma.purpose.findMany({ where: { isActive: true }, select: { name: true } }),
      prisma.stockLedger.findMany({ select: { destination: true }, where: { destination: { not: null } } }),
    ]);

    const unique = (arr, key) => [...new Set(arr.map(i => i[key]).filter(Boolean))].sort();

    return res.json({
      sizes: unique(variants, 'size'),
      variantTypes: unique(variants, 'type'),
      variantColors: unique(variants, 'color'),
      collections: unique(articles, 'collection'),
      articleFabrics: unique(articles, 'fabric'),
      articleSeasons: unique(articles, 'season'),
      fabricTypes: unique(fabrics, 'type'),
      fabricColors: unique(fabrics, 'color'),
      fabricSeasons: unique(fabrics, 'season'),
      accessoryCategories: unique(accessories, 'category'),
      accessoryUnits: unique(accessories, 'unit'),
      purposes: purposes.map(p => p.name).sort(),
      destinations: unique(stockLedger, 'destination'),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get filter options', details: err.message });
  }
};

const createExcelWorkbook = (title, columns, rows) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Garment ERP';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(title);
  sheet.columns = columns;
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  rows.forEach(r => sheet.addRow(r));
  return workbook;
};

const exportReportExcel = async (req, res) => {
  try {
    const { type } = req.params;
    let title, columns, rows;

    if (type === 'stock') {
      req.query = { ...req.query };
      const result = await getReportData('stock', req.query);
      title = 'Stock Report';
      columns = [
        { header: 'Image URL', key: 'imageUrl', width: 40 },
        { header: 'SKU', key: 'sku', width: 20 },
        { header: 'Article', key: 'articleName', width: 25 },
        { header: 'Collection', key: 'collection', width: 18 },
        { header: 'Fabric', key: 'fabric', width: 18 },
        { header: 'Season', key: 'season', width: 12 },
        { header: 'Size', key: 'size', width: 10 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Color', key: 'color', width: 15 },
        { header: 'Quantity', key: 'quantity', width: 12 },
        { header: 'Created', key: 'createdAt', width: 14 },
      ];
      rows = result.data;
    } else if (type === 'movements') {
      const result = await getReportData('movements', req.query);
      title = 'Stock Movements';
      columns = [
        { header: 'Image URL', key: 'imageUrl', width: 40 },
        { header: 'SKU', key: 'sku', width: 20 },
        { header: 'Type', key: 'movementType', width: 8 },
        { header: 'Qty', key: 'qty', width: 10 },
        { header: 'Purpose', key: 'purpose', width: 18 },
        { header: 'Destination', key: 'destination', width: 18 },
        { header: 'Reference', key: 'reference', width: 18 },
        { header: 'Note', key: 'note', width: 25 },
        { header: 'Date', key: 'createdAt', width: 14 },
      ];
      rows = result.data;
    } else if (type === 'fabric') {
      const result = await getReportData('fabric', req.query);
      title = 'Fabric Report';
      columns = [
        { header: 'Image URL', key: 'imageUrl', width: 40 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Type', key: 'type', width: 18 },
        { header: 'Color', key: 'color', width: 15 },
        { header: 'Season', key: 'season', width: 12 },
        { header: 'Meters', key: 'meters', width: 12 },
        { header: 'Created', key: 'createdAt', width: 14 },
      ];
      rows = result.data;
    } else if (type === 'fabric-movements') {
      const result = await getReportData('fabric-movements', req.query);
      title = 'Fabric Movements';
      columns = [
        { header: 'Fabric', key: 'fabricName', width: 25 },
        { header: 'Type', key: 'fabricType', width: 18 },
        { header: 'Color', key: 'fabricColor', width: 15 },
        { header: 'Movement', key: 'movementType', width: 10 },
        { header: 'Meters', key: 'meters', width: 12 },
        { header: 'Purpose', key: 'purpose', width: 18 },
        { header: 'Note', key: 'note', width: 25 },
        { header: 'Date', key: 'createdAt', width: 14 },
      ];
      rows = result.data;
    } else if (type === 'accessories') {
      const result = await getReportData('accessories', req.query);
      title = 'Accessories Report';
      columns = [
        { header: 'Image URL', key: 'imageUrl', width: 40 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Category', key: 'category', width: 18 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Quantity', key: 'quantity', width: 12 },
        { header: 'Created', key: 'createdAt', width: 14 },
      ];
      rows = result.data;
    } else if (type === 'accessory-movements') {
      const result = await getReportData('accessory-movements', req.query);
      title = 'Accessory Movements';
      columns = [
        { header: 'Accessory', key: 'accessoryName', width: 25 },
        { header: 'Category', key: 'category', width: 18 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Movement', key: 'movementType', width: 10 },
        { header: 'Quantity', key: 'quantity', width: 12 },
        { header: 'Purpose', key: 'purpose', width: 18 },
        { header: 'Note', key: 'note', width: 25 },
        { header: 'Date', key: 'createdAt', width: 14 },
      ];
      rows = result.data;
    } else if (type === 'purpose') {
      const result = await getReportData('purpose', req.query);
      title = 'Purpose Report';
      const flatRows = [];
      result.data.forEach(p => {
        p.skus.forEach(s => {
          flatRows.push({ purpose: p.purpose, sku: s.sku, in: s.in, out: s.out, net: s.in - s.out });
        });
        if (p.skus.length === 0) {
          flatRows.push({ purpose: p.purpose, sku: '(no SKUs)', in: p.totalIn, out: p.totalOut, net: p.totalIn - p.totalOut });
        }
      });
      columns = [
        { header: 'Purpose', key: 'purpose', width: 18 },
        { header: 'SKU', key: 'sku', width: 22 },
        { header: 'IN', key: 'in', width: 10 },
        { header: 'OUT', key: 'out', width: 10 },
        { header: 'Net', key: 'net', width: 10 },
      ];
      rows = flatRows;
    } else if (type === 'activity') {
      const result = await getReportData('activity', req.query);
      title = 'Activity Log';
      columns = [
        { header: 'User', key: 'userEmail', width: 25 },
        { header: 'Action', key: 'action', width: 18 },
        { header: 'Entity', key: 'entity', width: 15 },
        { header: 'Entity ID', key: 'entityId', width: 10 },
        { header: 'Details', key: 'details', width: 40 },
        { header: 'Date', key: 'createdAt', width: 20 },
      ];
      rows = result.data;
    } else {
      return res.status(400).json({ error: 'Unknown report type' });
    }

    const workbook = createExcelWorkbook(title, columns, rows);
    const filename = `${type}_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to export report', details: err.message });
  }
};

const getReportData = async (type, query) => {
  const fakeReq = { query };
  let result;
  await new Promise((resolve, reject) => {
    const fakeRes = {
      json: (d) => { result = d; resolve(); },
      status: (code) => ({ json: (d) => { result = d; reject(new Error(d.error || 'Error')); } }),
    };
    if (type === 'stock') getStockReport(fakeReq, fakeRes);
    else if (type === 'movements') getMovementsReport(fakeReq, fakeRes);
    else if (type === 'fabric') getFabricReport(fakeReq, fakeRes);
    else if (type === 'fabric-movements') getFabricMovementsReport(fakeReq, fakeRes);
    else if (type === 'accessories') getAccessoriesReport(fakeReq, fakeRes);
    else if (type === 'accessory-movements') getAccessoryMovementsReport(fakeReq, fakeRes);
    else if (type === 'purpose') getPurposeReport(fakeReq, fakeRes);
    else if (type === 'activity') getActivityReport(fakeReq, fakeRes);
    else reject(new Error('Unknown type'));
  });
  return result;
};

module.exports = {
  getStockReport,
  getMovementsReport,
  getFabricReport,
  getAccessoriesReport,
  getPurposeReport,
  getActivityReport,
  getFabricMovementsReport,
  getAccessoryMovementsReport,
  getFilterOptions,
  exportReportExcel,
};
