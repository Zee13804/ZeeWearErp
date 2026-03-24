const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logActivity } = require('./activityLogController');

const uploadImage = async (req, res) => {
  try {
    const { articleId, variantId, alt } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    if (!articleId && !variantId) {
      return res.status(400).json({ error: 'Either articleId or variantId is required' });
    }

    if (articleId) {
      const article = await prisma.article.findUnique({ where: { id: parseInt(articleId) } });
      if (!article || !article.isActive) {
        return res.status(404).json({ error: 'Article not found or inactive' });
      }
    }

    if (variantId) {
      const variant = await prisma.variant.findUnique({ where: { id: parseInt(variantId) } });
      if (!variant || !variant.isActive) {
        return res.status(404).json({ error: 'Variant not found or inactive' });
      }
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    if (articleId) {
      await prisma.image.deleteMany({ where: { articleId: parseInt(articleId) } });
    }
    if (variantId) {
      await prisma.image.deleteMany({ where: { variantId: parseInt(variantId) } });
    }

    const image = await prisma.image.create({
      data: {
        url: imageUrl,
        alt: alt || req.file.originalname,
        sortOrder: 0,
        articleId: articleId ? parseInt(articleId) : null,
        variantId: variantId ? parseInt(variantId) : null,
      },
    });

    if (req.user) {
      const entity = articleId ? 'Article' : 'Variant';
      const entityId = parseInt(articleId || variantId);
      logActivity(req.user.id, 'UPLOAD_IMAGE', entity, entityId, `Uploaded image: ${req.file.originalname}`, req.ip);
    }

    return res.status(201).json({ message: 'Image uploaded successfully', image });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to upload image', details: err.message });
  }
};

const getImages = async (req, res) => {
  try {
    const { articleId, variantId } = req.query;
    const where = {};
    if (articleId) where.articleId = parseInt(articleId);
    if (variantId) where.variantId = parseInt(variantId);

    const images = await prisma.image.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return res.status(200).json({ images });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch images', details: err.message });
  }
};

const deleteImage = async (req, res) => {
  try {
    const { id } = req.params;

    const image = await prisma.image.findUnique({ where: { id: parseInt(id) } });
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    await prisma.image.delete({ where: { id: parseInt(id) } });

    if (req.user) {
      logActivity(req.user.id, 'DELETE_IMAGE', 'Image', image.id, `Deleted image: ${image.url}`, req.ip);
    }

    return res.status(200).json({ message: 'Image deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete image', details: err.message });
  }
};

module.exports = { uploadImage, getImages, deleteImage };
