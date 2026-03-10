const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logActivity } = require('./activityLogController');

const createArticle = async (req, res) => {
  try {
    const { name, collection, fabric, season, category, description, costPrice, sellingPrice } = req.body;

    if (!name || !collection || !fabric || !season) {
      return res.status(400).json({ error: 'Required fields: name, collection, fabric, season' });
    }

    const article = await prisma.article.create({
      data: {
        name,
        collection,
        fabric,
        season,
        category: category || 'General',
        description: description || null,
        costPrice: costPrice ? parseFloat(costPrice) : null,
        sellingPrice: sellingPrice ? parseFloat(sellingPrice) : null,
      },
    });

    if (req.user) {
      logActivity(req.user.id, 'CREATE', 'Article', article.id, `Created article: ${name}`, req.ip);
    }

    return res.status(201).json({ message: 'Article created successfully', article });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create article', details: err.message });
  }
};

const getAllArticles = async (req, res) => {
  try {
    const { search, collection, fabric, season, category, dateFrom, dateTo } = req.query;
    const where = { isActive: true };

    if (search) {
      where.name = { contains: search };
    }
    if (collection) {
      where.collection = collection;
    }
    if (fabric) {
      where.fabric = fabric;
    }
    if (season) {
      where.season = season;
    }
    if (category) {
      where.category = category;
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }

    const articles = await prisma.article.findMany({
      where,
      include: { variants: { select: { id: true, sku: true, quantity: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ articles });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch articles', details: err.message });
  }
};

const getArticleById = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await prisma.article.findUnique({
      where: { id: parseInt(id) },
      include: { variants: true, images: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!article || !article.isActive) {
      return res.status(404).json({ error: 'Article not found' });
    }

    return res.status(200).json({ article });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch article', details: err.message });
  }
};

const updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, collection, fabric, season, category, description, costPrice, sellingPrice } = req.body;

    const existing = await prisma.article.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing || !existing.isActive) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const article = await prisma.article.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(collection && { collection }),
        ...(fabric && { fabric }),
        ...(season && { season }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description: description || null }),
        ...(costPrice !== undefined && { costPrice: costPrice ? parseFloat(costPrice) : null }),
        ...(sellingPrice !== undefined && { sellingPrice: sellingPrice ? parseFloat(sellingPrice) : null }),
      },
    });

    if (req.user) {
      logActivity(req.user.id, 'UPDATE', 'Article', article.id, `Updated article: ${article.name}`, req.ip);
    }

    return res.status(200).json({ message: 'Article updated successfully', article });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update article', details: err.message });
  }
};

const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.article.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing || !existing.isActive) {
      return res.status(404).json({ error: 'Article not found' });
    }

    await prisma.article.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    if (req.user) {
      logActivity(req.user.id, 'DELETE', 'Article', existing.id, `Deleted article: ${existing.name}`, req.ip);
    }

    return res.status(200).json({ message: 'Article deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete article', details: err.message });
  }
};

const getArticleFilterOptions = async (req, res) => {
  try {
    const articles = await prisma.article.findMany({
      where: { isActive: true },
      select: { collection: true, fabric: true, season: true, category: true },
    });

    const unique = (key) => [...new Set(articles.map(a => a[key]).filter(Boolean))].sort();

    return res.json({
      collections: unique('collection'),
      fabrics: unique('fabric'),
      seasons: unique('season'),
      categories: unique('category'),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get filter options', details: err.message });
  }
};

module.exports = {
  createArticle,
  getAllArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
  getArticleFilterOptions,
};
