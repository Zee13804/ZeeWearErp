const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', '..', '..', 'uploads');

function readImageAsBase64(imageUrl) {
  try {
    if (!imageUrl) return null;
    const filename = imageUrl.replace('/uploads/', '').replace('/api/uploads/', '');
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    const mime = ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/webp';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (e) {
    return null;
  }
}

const exportBackup = async (req, res) => {
  try {
    const [articles, fabrics, accessories, purposes, users, images, stockLedger, fabricLedger, accessoryLedger] = await Promise.all([
      prisma.article.findMany({
        where: { isActive: true },
        include: { variants: true },
      }),
      prisma.fabric.findMany({ where: { isActive: true } }),
      prisma.accessory.findMany({ where: { isActive: true } }),
      prisma.purpose.findMany({ where: { isActive: true } }),
      prisma.user.findMany({
        where: { role: { not: 'dev' } },
        select: { id: true, email: true, role: true },
      }),
      prisma.image.findMany(),
      prisma.stockLedger.findMany(),
      prisma.fabricLedger.findMany(),
      prisma.accessoryLedger.findMany(),
    ]);

    const imageFiles = {};
    const allImageUrls = new Set();

    images.forEach(img => { if (img.url) allImageUrls.add(img.url); });
    fabrics.forEach(f => { if (f.imageUrl) allImageUrls.add(f.imageUrl); });
    accessories.forEach(a => { if (a.imageUrl) allImageUrls.add(a.imageUrl); });

    for (const url of allImageUrls) {
      const base64 = readImageAsBase64(url);
      if (base64) {
        imageFiles[url] = base64;
      }
    }

    const totalArticles = articles.length;
    const totalVariants = articles.reduce((sum, a) => sum + (a.variants ? a.variants.length : 0), 0);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: '2.0',
      summary: {
        articles: totalArticles,
        variants: totalVariants,
        fabrics: fabrics.length,
        accessories: accessories.length,
        purposes: purposes.length,
        users: users.length,
        images: images.length,
        imageFiles: Object.keys(imageFiles).length,
        stockMovements: stockLedger.length,
        fabricMovements: fabricLedger.length,
        accessoryMovements: accessoryLedger.length,
      },
      data: {
        articles,
        fabrics,
        accessories,
        purposes,
        users,
        images,
        stockLedger,
        fabricLedger,
        accessoryLedger,
      },
      imageFiles,
    };

    const date = new Date().toISOString().split('T')[0];
    const filename = `erp-backup-${date}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(backup);
  } catch (error) {
    console.error('Backup export error:', error);
    res.status(500).json({ error: 'Failed to export backup' });
  }
};

function saveBase64Image(imageUrl, base64Data) {
  try {
    if (!base64Data || !imageUrl) return false;
    const filename = imageUrl.replace('/uploads/', '').replace('/api/uploads/', '');
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) return true;
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    const matches = base64Data.match(/^data:.+;base64,(.+)$/);
    if (!matches) return false;
    const buffer = Buffer.from(matches[1], 'base64');
    fs.writeFileSync(filePath, buffer);
    return true;
  } catch (e) {
    console.error('Failed to save image:', imageUrl, e.message);
    return false;
  }
}

const importBackup = async (req, res) => {
  try {
    const backup = req.body;

    if (!backup || !backup.data) {
      return res.status(400).json({ error: 'Invalid backup file format. Expected { exportedAt, data: { ... } }' });
    }

    const { articles, fabrics, accessories, purposes, images: backupImages, stockLedger, fabricLedger, accessoryLedger } = backup.data;
    const imageFiles = backup.imageFiles || {};
    const counts = { articles: 0, variants: 0, fabrics: 0, accessories: 0, purposes: 0, images: 0, imageFiles: 0, skipped: 0 };

    const articleIdMap = {};
    const fabricIdMap = {};
    const accessoryIdMap = {};
    const variantIdMap = {};

    if (purposes && purposes.length > 0) {
      for (const p of purposes) {
        await prisma.purpose.upsert({
          where: { name: p.name },
          update: { type: p.type || 'general', isActive: p.isActive !== false },
          create: { name: p.name, type: p.type || 'general', isActive: p.isActive !== false },
        });
        counts.purposes++;
      }
    }

    if (fabrics && fabrics.length > 0) {
      for (const f of fabrics) {
        const existing = await prisma.fabric.findFirst({
          where: { name: f.name, type: f.type, color: f.color },
        });
        if (existing) {
          if (f.id) fabricIdMap[f.id] = existing.id;
          counts.skipped++;
        } else {
          if (f.imageUrl && imageFiles[f.imageUrl]) {
            saveBase64Image(f.imageUrl, imageFiles[f.imageUrl]);
          }
          const created = await prisma.fabric.create({
            data: {
              name: f.name,
              type: f.type,
              color: f.color,
              season: f.season || null,
              meters: f.meters || 0,
              imageUrl: f.imageUrl || null,
              isActive: f.isActive !== false,
            },
          });
          if (f.id) fabricIdMap[f.id] = created.id;
          counts.fabrics++;
        }
      }
    }

    if (accessories && accessories.length > 0) {
      for (const a of accessories) {
        const existing = await prisma.accessory.findFirst({
          where: { name: a.name, category: a.category },
        });
        if (existing) {
          if (a.id) accessoryIdMap[a.id] = existing.id;
          counts.skipped++;
        } else {
          if (a.imageUrl && imageFiles[a.imageUrl]) {
            saveBase64Image(a.imageUrl, imageFiles[a.imageUrl]);
          }
          const created = await prisma.accessory.create({
            data: {
              name: a.name,
              category: a.category,
              unit: a.unit,
              quantity: a.quantity || 0,
              imageUrl: a.imageUrl || null,
              isActive: a.isActive !== false,
            },
          });
          if (a.id) accessoryIdMap[a.id] = created.id;
          counts.accessories++;
        }
      }
    }

    if (articles && articles.length > 0) {
      for (const art of articles) {
        const existing = await prisma.article.findFirst({
          where: { name: art.name, collection: art.collection },
        });
        if (existing) {
          if (art.id) articleIdMap[art.id] = existing.id;
          counts.skipped++;
        } else {
          const newArticle = await prisma.article.create({
            data: {
              name: art.name,
              collection: art.collection,
              fabric: art.fabric,
              season: art.season,
              category: art.category || 'General',
              description: art.description || null,
              costPrice: art.costPrice || null,
              sellingPrice: art.sellingPrice || null,
              isActive: art.isActive !== false,
            },
          });
          if (art.id) articleIdMap[art.id] = newArticle.id;
          counts.articles++;

          if (art.variants && art.variants.length > 0) {
            for (const v of art.variants) {
              const skuExists = await prisma.variant.findFirst({ where: { sku: v.sku } });
              if (!skuExists) {
                let importBarcode = v.barcode || null;
                if (importBarcode) {
                  const bcExists = await prisma.variant.findFirst({ where: { barcode: importBarcode } });
                  if (bcExists) importBarcode = null;
                }
                const newVariant = await prisma.variant.create({
                  data: {
                    sku: v.sku,
                    size: v.size,
                    type: v.type,
                    color: v.color,
                    quantity: v.quantity || 0,
                    barcode: importBarcode,
                    isActive: v.isActive !== false,
                    articleId: newArticle.id,
                  },
                });
                if (v.id) variantIdMap[v.id] = newVariant.id;
                counts.variants++;
              } else {
                if (v.id) variantIdMap[v.id] = skuExists.id;
              }
            }
          }
        }
      }
    }

    if (backupImages && backupImages.length > 0) {
      for (const img of backupImages) {
        if (img.url && imageFiles[img.url]) {
          const saved = saveBase64Image(img.url, imageFiles[img.url]);
          if (saved) counts.imageFiles++;
        }

        const newArticleId = img.articleId ? (articleIdMap[img.articleId] || null) : null;
        const newVariantId = img.variantId ? (variantIdMap[img.variantId] || null) : null;

        if (newArticleId || newVariantId) {
          const existingImg = await prisma.image.findFirst({
            where: {
              ...(newArticleId ? { articleId: newArticleId } : {}),
              ...(newVariantId ? { variantId: newVariantId } : {}),
            },
          });
          if (!existingImg) {
            await prisma.image.create({
              data: {
                url: img.url,
                alt: img.alt || null,
                sortOrder: img.sortOrder || 0,
                articleId: newArticleId,
                variantId: newVariantId,
              },
            });
            counts.images++;
          }
        }
      }
    }

    let stockLedgerCount = 0;
    let fabricLedgerCount = 0;
    let accessoryLedgerCount = 0;

    if (stockLedger && stockLedger.length > 0) {
      const existingSkus = new Set();
      const existingLedgers = await prisma.stockLedger.findMany({ select: { sku: true, movementType: true, qty: true, createdAt: true } });
      existingLedgers.forEach(l => existingSkus.add(`${l.sku}-${l.movementType}-${l.qty}-${new Date(l.createdAt).getTime()}`));

      for (const sl of stockLedger) {
        const key = `${sl.sku}-${sl.movementType}-${sl.qty}-${new Date(sl.createdAt).getTime()}`;
        if (!existingSkus.has(key)) {
          await prisma.stockLedger.create({
            data: {
              sku: sl.sku,
              movementType: sl.movementType,
              qty: sl.qty,
              purpose: sl.purpose || 'Import',
              note: sl.note || null,
              destination: sl.destination || null,
              reference: sl.reference || null,
              productionOrderId: sl.productionOrderId || null,
              createdAt: sl.createdAt ? new Date(sl.createdAt) : new Date(),
            },
          });
          stockLedgerCount++;
        }
      }
    }

    if (fabricLedger && fabricLedger.length > 0) {
      for (const fl of fabricLedger) {
        const newFabricId = fl.fabricId ? (fabricIdMap[fl.fabricId] || null) : null;
        if (newFabricId) {
          await prisma.fabricLedger.create({
            data: {
              fabricId: newFabricId,
              movementType: fl.movementType,
              meters: fl.meters,
              purpose: fl.purpose || 'Import',
              note: fl.note || null,
              component: fl.component || null,
              productionOrderId: fl.productionOrderId || null,
              createdAt: fl.createdAt ? new Date(fl.createdAt) : new Date(),
            },
          });
          fabricLedgerCount++;
        }
      }
    }

    if (accessoryLedger && accessoryLedger.length > 0) {
      for (const al of accessoryLedger) {
        const newAccId = al.accessoryId ? (accessoryIdMap[al.accessoryId] || null) : null;
        if (newAccId) {
          await prisma.accessoryLedger.create({
            data: {
              accessoryId: newAccId,
              movementType: al.movementType,
              quantity: al.quantity,
              purpose: al.purpose || 'Import',
              note: al.note || null,
              createdAt: al.createdAt ? new Date(al.createdAt) : new Date(),
            },
          });
          accessoryLedgerCount++;
        }
      }
    }

    counts.stockMovements = stockLedgerCount;
    counts.fabricMovements = fabricLedgerCount;
    counts.accessoryMovements = accessoryLedgerCount;

    res.json({
      message: 'Backup imported successfully',
      imported: counts,
    });
  } catch (error) {
    console.error('Backup import error:', error);
    res.status(500).json({ error: 'Failed to import backup: ' + error.message });
  }
};

module.exports = { exportBackup, importBackup };
