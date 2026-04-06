const PDFDocument = require('pdfkit');
const { PrismaClient } = require('@prisma/client');
const { sendTelegramDocument, sendTelegramMessage } = require('./notificationService');
const prisma = new PrismaClient();

function fmt(n) {
  return `Rs ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

async function generateDailyReport() {
  const { start, end } = todayRange();
  const dateStr = start.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const [
    invoices,
    invoicePayments,
    expenses,
    supplierPayments,
    transfers,
    advances,
    salaries,
    courierPayments,
    accounts,
    stockAlerts,
  ] = await Promise.all([
    prisma.invoice.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { customer: { select: { name: true } } },
    }),
    prisma.invoicePayment.findMany({
      where: { paymentDate: { gte: start, lte: end } },
      include: {
        invoice: { select: { invoiceNo: true } },
        account: { select: { name: true } },
      },
    }),
    prisma.expense.findMany({
      where: { expenseDate: { gte: start, lte: end } },
      include: {
        category: { select: { name: true } },
        account: { select: { name: true } },
      },
    }),
    prisma.supplierPayment.findMany({
      where: { paymentDate: { gte: start, lte: end } },
      include: {
        supplier: { select: { name: true } },
        account: { select: { name: true } },
      },
    }),
    prisma.accountTransfer.findMany({
      where: { date: { gte: start, lte: end } },
      include: {
        fromAccount: { select: { name: true } },
        toAccount: { select: { name: true } },
      },
    }),
    prisma.advance.findMany({
      where: { advanceDate: { gte: start, lte: end } },
      include: { employee: { select: { name: true } } },
    }),
    prisma.salaryRecord.findMany({
      where: { paidAt: { gte: start, lte: end }, isPaid: true },
      include: { employee: { select: { name: true } } },
    }),
    prisma.courierPayment.findMany({
      where: { paymentDate: { gte: start, lte: end } },
      include: { account: { select: { name: true } } },
    }),
    prisma.account.findMany({ where: { isActive: true } }),
    prisma.variant.findMany({
      where: { quantity: { lte: 0 }, isActive: true },
      include: { article: { select: { name: true } } },
      take: 20,
    }),
  ]);

  const totalInflow =
    invoicePayments.reduce((s, p) => s + p.amount, 0) +
    courierPayments.reduce((s, p) => s + p.netReceived, 0);
  const totalOutflow =
    expenses.reduce((s, e) => s + e.amount, 0) +
    supplierPayments.reduce((s, p) => s + p.amount, 0) +
    advances.reduce((s, a) => s + a.amount, 0) +
    salaries.reduce((s, s2) => s + s2.netSalary, 0);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));

  const titleFont = 'Helvetica-Bold';
  const bodyFont = 'Helvetica';
  const primary = '#1a1a2e';
  const accent = '#4a90d9';
  const green = '#27ae60';
  const red = '#e74c3c';
  const gray = '#666666';
  const lightGray = '#f5f5f5';

  const drawLine = (y, color = '#dddddd') => {
    doc.moveTo(40, y).lineTo(555, y).strokeColor(color).lineWidth(0.5).stroke();
  };

  const sectionHeader = (title, y) => {
    doc.rect(40, y, 515, 22).fill(accent);
    doc.font(titleFont).fontSize(10).fillColor('white').text(title, 48, y + 6);
    return y + 30;
  };

  doc.rect(0, 0, 595, 80).fill(primary);
  doc.font(titleFont).fontSize(18).fillColor('white').text('ZEE WEAR ERP', 40, 18);
  doc.font(bodyFont).fontSize(10).fillColor('#aaaacc').text('Daily Ledger Report', 40, 40);
  doc.font(bodyFont).fontSize(9).fillColor('#aaaacc').text(dateStr, 40, 54);

  doc.font(titleFont).fontSize(11).fillColor(green)
    .text(`Total Inflow: ${fmt(totalInflow)}`, 350, 20, { align: 'right', width: 165 });
  doc.font(titleFont).fontSize(11).fillColor(red)
    .text(`Total Outflow: ${fmt(totalOutflow)}`, 350, 36, { align: 'right', width: 165 });
  doc.font(titleFont).fontSize(10).fillColor('white')
    .text(`Net: ${fmt(totalInflow - totalOutflow)}`, 350, 52, { align: 'right', width: 165 });

  let y = 100;

  const col = (text, x, w, align = 'left', color = primary, bold = false) => {
    doc.font(bold ? titleFont : bodyFont).fontSize(8.5).fillColor(color)
      .text(text, x, y, { width: w, align });
  };

  const rowBg = (even) => {
    if (even) doc.rect(40, y - 2, 515, 16).fill(lightGray);
  };

  if (invoicePayments.length > 0) {
    y = sectionHeader('💰  PAYMENTS RECEIVED (Invoices)', y);
    col('Invoice No', 40, 100, 'left', gray, true);
    col('Account', 145, 130, 'left', gray, true);
    col('Amount', 400, 100, 'right', gray, true);
    y += 14; drawLine(y - 2);
    invoicePayments.forEach((p, i) => {
      rowBg(i % 2 === 0);
      col(p.invoice?.invoiceNo || '-', 40, 100);
      col(p.account?.name || '-', 145, 130);
      col(fmt(p.amount), 400, 100, 'right', green, true);
      y += 16;
    });
    const total = invoicePayments.reduce((s, p) => s + p.amount, 0);
    drawLine(y);
    y += 4;
    col('TOTAL', 300, 100, 'right', primary, true);
    col(fmt(total), 400, 100, 'right', green, true);
    y += 18;
  }

  if (courierPayments.length > 0) {
    y = sectionHeader('🚚  COURIER PAYMENTS (Leopard / LAAM)', y);
    col('Source', 40, 80, 'left', gray, true);
    col('Ref', 125, 100, 'left', gray, true);
    col('Gross', 230, 80, 'right', gray, true);
    col('Charge', 315, 80, 'right', gray, true);
    col('Net Received', 400, 100, 'right', gray, true);
    y += 14; drawLine(y - 2);
    courierPayments.forEach((p, i) => {
      rowBg(i % 2 === 0);
      col(p.source.toUpperCase(), 40, 80);
      col(p.paymentRef || '-', 125, 100);
      col(fmt(p.grossAmount), 230, 80, 'right');
      col(fmt(p.serviceCharge), 315, 80, 'right', red);
      col(fmt(p.netReceived), 400, 100, 'right', green, true);
      y += 16;
    });
    y += 6;
  }

  if (expenses.length > 0) {
    y = sectionHeader('💸  EXPENSES', y);
    col('Description', 40, 170, 'left', gray, true);
    col('Category', 215, 100, 'left', gray, true);
    col('Account', 320, 80, 'left', gray, true);
    col('Amount', 405, 100, 'right', gray, true);
    y += 14; drawLine(y - 2);
    expenses.forEach((e, i) => {
      rowBg(i % 2 === 0);
      col(e.description, 40, 170);
      col(e.category?.name || '-', 215, 100);
      col(e.account?.name || '-', 320, 80);
      col(fmt(e.amount), 405, 100, 'right', red, true);
      y += 16;
    });
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    drawLine(y); y += 4;
    col('TOTAL', 305, 100, 'right', primary, true);
    col(fmt(total), 405, 100, 'right', red, true);
    y += 18;
  }

  if (supplierPayments.length > 0) {
    y = sectionHeader('📦  SUPPLIER PAYMENTS', y);
    col('Supplier', 40, 200, 'left', gray, true);
    col('Account', 245, 110, 'left', gray, true);
    col('Amount', 405, 100, 'right', gray, true);
    y += 14; drawLine(y - 2);
    supplierPayments.forEach((p, i) => {
      rowBg(i % 2 === 0);
      col(p.supplier?.name || '-', 40, 200);
      col(p.account?.name || '-', 245, 110);
      col(fmt(p.amount), 405, 100, 'right', red, true);
      y += 16;
    });
    y += 6;
  }

  if (transfers.length > 0) {
    y = sectionHeader('🔄  ACCOUNT TRANSFERS', y);
    col('From', 40, 160, 'left', gray, true);
    col('To', 205, 160, 'left', gray, true);
    col('Amount', 405, 100, 'right', gray, true);
    y += 14; drawLine(y - 2);
    transfers.forEach((t, i) => {
      rowBg(i % 2 === 0);
      col(t.fromAccount?.name || '-', 40, 160);
      col(t.toAccount?.name || '-', 205, 160);
      col(fmt(t.amount), 405, 100, 'right', accent, true);
      y += 16;
    });
    y += 6;
  }

  if (invoices.length > 0) {
    y = sectionHeader('🧾  INVOICES CREATED', y);
    col('Invoice No', 40, 100, 'left', gray, true);
    col('Customer', 145, 180, 'left', gray, true);
    col('Total Amount', 405, 100, 'right', gray, true);
    y += 14; drawLine(y - 2);
    invoices.forEach((inv, i) => {
      rowBg(i % 2 === 0);
      col(inv.invoiceNo, 40, 100);
      col(inv.customer?.name || '-', 145, 180);
      col(fmt(inv.totalAmount), 405, 100, 'right', primary, true);
      y += 16;
    });
    y += 6;
  }

  if (advances.length > 0 || salaries.length > 0) {
    y = sectionHeader('👷  EMPLOYEE PAYMENTS', y);
    col('Employee', 40, 200, 'left', gray, true);
    col('Type', 245, 100, 'left', gray, true);
    col('Amount', 405, 100, 'right', gray, true);
    y += 14; drawLine(y - 2);
    advances.forEach((a, i) => {
      rowBg(i % 2 === 0);
      col(a.employee?.name || '-', 40, 200);
      col('Advance', 245, 100);
      col(fmt(a.amount), 405, 100, 'right', red, true);
      y += 16;
    });
    salaries.forEach((s, i) => {
      rowBg((i + advances.length) % 2 === 0);
      col(s.employee?.name || '-', 40, 200);
      col('Salary', 245, 100);
      col(fmt(s.netSalary), 405, 100, 'right', red, true);
      y += 16;
    });
    y += 6;
  }

  if (stockAlerts.length > 0) {
    y = sectionHeader('⚠️  STOCK ALERTS (Out of Stock)', y);
    col('Article', 40, 200, 'left', gray, true);
    col('Variant', 245, 150, 'left', gray, true);
    col('SKU', 400, 110, 'left', gray, true);
    y += 14; drawLine(y - 2);
    stockAlerts.forEach((v, i) => {
      rowBg(i % 2 === 0);
      col(v.article?.name || '-', 40, 200);
      col(`${v.color} / ${v.size}`, 245, 150);
      col(v.sku, 400, 110);
      y += 16;
    });
    y += 6;
  }

  y += 10;
  drawLine(y, primary);
  y += 8;
  doc.font(bodyFont).fontSize(8).fillColor(gray)
    .text(`Generated by ZeeWear ERP • ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`, 40, y, { align: 'center', width: 515 });

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      resolve(pdfBuffer);
    });
  });
}

async function sendDailyReport() {
  try {
    const { start } = todayRange();
    const dateStr = start.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
    console.log('[DailyReport] Generating daily report for', dateStr);

    const pdfBuffer = await generateDailyReport();
    const filename = `daily-ledger-${start.toISOString().split('T')[0]}.pdf`;
    await sendTelegramDocument(pdfBuffer, filename, `📊 Daily Ledger Report — ${dateStr}`);
    console.log('[DailyReport] Sent successfully');
  } catch (err) {
    console.error('[DailyReport] Failed:', err.message);
    await sendTelegramMessage(`⚠️ Daily report generation failed: ${err.message}`);
  }
}

module.exports = { sendDailyReport, generateDailyReport };
