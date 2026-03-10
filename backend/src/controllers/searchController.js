const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ results: [] });
    }

    const term = q.trim();

    const [articles, variants, fabrics, accessories] = await Promise.all([
      prisma.article.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: term } },
            { collection: { contains: term } },
            { fabric: { contains: term } },
            { category: { contains: term } },
            { season: { contains: term } },
          ],
        },
        select: { id: true, name: true, collection: true, category: true },
        take: 5,
      }),
      prisma.variant.findMany({
        where: {
          isActive: true,
          OR: [
            { sku: { contains: term } },
            { barcode: { contains: term } },
            { color: { contains: term } },
            { size: { contains: term } },
            { type: { contains: term } },
          ],
        },
        select: {
          id: true,
          sku: true,
          barcode: true,
          size: true,
          color: true,
          type: true,
          quantity: true,
          articleId: true,
          article: { select: { name: true } },
        },
        take: 5,
      }),
      prisma.fabric.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: term } },
            { type: { contains: term } },
            { color: { contains: term } },
          ],
        },
        select: { id: true, name: true, type: true, color: true, meters: true },
        take: 5,
      }),
      prisma.accessory.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: term } },
            { category: { contains: term } },
          ],
        },
        select: { id: true, name: true, category: true, quantity: true },
        take: 5,
      }),
    ]);

    const results = [];

    articles.forEach((a) =>
      results.push({
        type: "article",
        id: a.id,
        title: a.name,
        subtitle: `${a.category} · ${a.collection}`,
        href: `/articles/${a.id}`,
      })
    );

    variants.forEach((v) =>
      results.push({
        type: "variant",
        id: v.id,
        title: v.sku,
        subtitle: `${v.article?.name || ""} · ${v.color} · ${v.size} · Qty: ${v.quantity}${v.barcode ? ` · BC: ${v.barcode}` : ''}`,
        href: `/articles/${v.articleId}`,
      })
    );

    fabrics.forEach((f) =>
      results.push({
        type: "fabric",
        id: f.id,
        title: f.name,
        subtitle: `${f.type} · ${f.color} · ${f.meters}m`,
        href: `/fabric`,
      })
    );

    accessories.forEach((a) =>
      results.push({
        type: "accessory",
        id: a.id,
        title: a.name,
        subtitle: `${a.category} · Qty: ${a.quantity}`,
        href: `/accessories`,
      })
    );

    res.json({ results });
  } catch (error) {
    console.error("Global search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
};
