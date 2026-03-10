const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const prisma = new PrismaClient();
const { generateSku } = require('../utils/skuGenerator');
const { logActivity } = require('./activityLogController');

const importVariantsExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No Excel file provided' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return res.status(400).json({ error: 'Excel file has no worksheets' });
    }

    const headers = [];
    sheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = String(cell.value).toLowerCase().trim();
    });

    const requiredHeaders = ['articleid', 'size', 'type', 'color'];
    const missing = requiredHeaders.filter(h => !headers.includes(h));
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing required columns: ${missing.join(', ')}`,
        expectedColumns: ['articleId', 'size', 'type', 'color', 'sku (optional)', 'barcode (optional)', 'quantity (optional)'],
      });
    }

    const colMap = {};
    headers.forEach((h, i) => { colMap[h] = i; });

    const results = { created: 0, skipped: 0, errors: [] };
    const rows = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const rowData = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) rowData[header] = cell.value;
      });
      rows.push({ rowNumber, data: rowData });
    });

    for (const { rowNumber, data } of rows) {
      try {
        const articleId = parseInt(data.articleid);
        const size = String(data.size || '').trim();
        const type = String(data.type || '').trim();
        const color = String(data.color || '').trim();
        const quantity = parseInt(data.quantity) || 0;
        let sku = data.sku ? String(data.sku).trim() : null;

        if (!articleId || !size || !type || !color) {
          results.errors.push({ row: rowNumber, error: 'Missing required fields' });
          results.skipped++;
          continue;
        }

        const article = await prisma.article.findUnique({ where: { id: articleId } });
        if (!article || !article.isActive) {
          results.errors.push({ row: rowNumber, error: `Article ID ${articleId} not found or inactive` });
          results.skipped++;
          continue;
        }

        if (sku) {
          const existing = await prisma.variant.findUnique({ where: { sku } });
          if (existing) {
            results.errors.push({ row: rowNumber, error: `SKU ${sku} already exists` });
            results.skipped++;
            continue;
          }
        } else {
          sku = await generateSku(article.name, color, size);
        }

        if (quantity < 0) {
          results.errors.push({ row: rowNumber, error: 'Quantity cannot be negative' });
          results.skipped++;
          continue;
        }

        let barcode = data.barcode ? String(data.barcode).trim() : null;
        if (barcode) {
          const bcExists = await prisma.variant.findFirst({ where: { barcode } });
          if (bcExists) {
            results.errors.push({ row: rowNumber, error: `Barcode ${barcode} already exists` });
            barcode = null;
          }
        }

        await prisma.variant.create({
          data: { sku, size, type, color, quantity, barcode, articleId },
        });

        results.created++;
      } catch (err) {
        results.errors.push({ row: rowNumber, error: err.message });
        results.skipped++;
      }
    }

    if (req.user) {
      logActivity(req.user.id, 'BULK_IMPORT', 'Variant', null,
        `Imported ${results.created} variants, ${results.skipped} skipped from Excel`, req.ip);
    }

    return res.status(200).json({
      message: `Import complete: ${results.created} created, ${results.skipped} skipped`,
      results,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to import Excel', details: err.message });
  }
};

const downloadImportTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Garment ERP';

    const sheet = workbook.addWorksheet('Variants Import');

    sheet.columns = [
      { header: 'articleId', key: 'articleId', width: 12 },
      { header: 'sku', key: 'sku', width: 20 },
      { header: 'barcode', key: 'barcode', width: 18 },
      { header: 'size', key: 'size', width: 12 },
      { header: 'type', key: 'type', width: 15 },
      { header: 'color', key: 'color', width: 15 },
      { header: 'quantity', key: 'quantity', width: 12 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };

    sheet.addRow({ articleId: 1, sku: '', barcode: '', size: 'M', type: '3PC', color: 'Blue', quantity: 10 });
    sheet.addRow({ articleId: 1, sku: '', barcode: '', size: 'L', type: '3PC', color: 'Blue', quantity: 5 });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=variants_import_template.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate template', details: err.message });
  }
};

module.exports = { importVariantsExcel, downloadImportTemplate };
