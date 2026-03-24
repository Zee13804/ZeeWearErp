const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const generateSku = async (articleName, color, size) => {
  const artCode = articleName
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X');

  const colCode = color
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X');

  const sizeCode = size
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 2)
    .toUpperCase()
    .padEnd(2, 'X');

  const basePrefix = `${artCode}-${colCode}-${sizeCode}`;

  const existing = await prisma.variant.findMany({
    where: { sku: { startsWith: basePrefix } },
    select: { sku: true },
    orderBy: { sku: 'desc' },
  });

  let seq = 1;
  if (existing.length > 0) {
    const lastSku = existing[0].sku;
    const lastSeqStr = lastSku.split('-').pop();
    const lastSeq = parseInt(lastSeqStr, 10);
    if (!isNaN(lastSeq)) {
      seq = lastSeq + 1;
    }
  }

  const seqStr = String(seq).padStart(3, '0');
  return `${basePrefix}-${seqStr}`;
};

module.exports = { generateSku };
