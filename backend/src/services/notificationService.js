const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getSetting(key) {
  try {
    const s = await prisma.appSetting.findUnique({ where: { key } });
    return s ? s.value : null;
  } catch {
    return null;
  }
}

async function getNotifSettings() {
  const [token, chatId] = await Promise.all([
    getSetting('telegram_bot_token'),
    getSetting('telegram_chat_id'),
  ]);
  return { token, chatId };
}

async function isEventEnabled(eventKey) {
  const val = await getSetting(`notif_${eventKey}`);
  return val !== 'false';
}

async function sendTelegramMessage(text) {
  const { token, chatId } = await getNotifSettings();
  if (!token || !chatId) return;
  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });
  } catch (err) {
    console.error('[Telegram] Message failed:', err.message);
  }
}

async function sendTelegramDocument(buffer, filename, caption) {
  const { token, chatId } = await getNotifSettings();
  if (!token || !chatId) return;
  try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('document', buffer, { filename, contentType: 'application/pdf' });
    if (caption) form.append('caption', caption);
    await axios.post(`https://api.telegram.org/bot${token}/sendDocument`, form, {
      headers: form.getHeaders(),
    });
  } catch (err) {
    console.error('[Telegram] Document send failed:', err.message);
  }
}

function fmt(amount) {
  return `Rs ${Number(amount || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

function now() {
  return new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi', hour12: true });
}

async function getAccountBalance(accountId) {
  try {
    const acc = await prisma.account.findUnique({ where: { id: accountId } });
    if (!acc) return null;

    const [inflow, expOut, supOut, tIn, tOut, advOut, salOut, labOut, vendorOut, courierIn] = await Promise.all([
      prisma.invoicePayment.aggregate({ where: { accountId }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { accountId }, _sum: { amount: true } }),
      prisma.supplierPayment.aggregate({ where: { accountId }, _sum: { amount: true } }),
      prisma.accountTransfer.aggregate({ where: { toAccountId: accountId }, _sum: { amount: true } }),
      prisma.accountTransfer.aggregate({ where: { fromAccountId: accountId }, _sum: { amount: true } }),
      prisma.advance.aggregate({ where: { accountId }, _sum: { amount: true } }),
      prisma.salaryRecord.aggregate({ where: { accountId, isPaid: true }, _sum: { netSalary: true } }),
      prisma.labourPayment.aggregate({ where: { accountId }, _sum: { amount: true } }),
      prisma.outsourceVendorPayment.aggregate({ where: { accountId }, _sum: { amount: true } }),
      prisma.courierPayment.aggregate({ where: { accountId }, _sum: { netReceived: true } }),
    ]);

    const balance = acc.openingBalance
      + (inflow._sum.amount || 0)
      + (tIn._sum.amount || 0)
      + (courierIn._sum.netReceived || 0)
      - (expOut._sum.amount || 0)
      - (supOut._sum.amount || 0)
      - (tOut._sum.amount || 0)
      - (advOut._sum.amount || 0)
      - (salOut._sum.netSalary || 0)
      - (labOut._sum.amount || 0)
      - (vendorOut._sum.amount || 0);

    return { name: acc.name, balance: Math.round(balance * 100) / 100 };
  } catch {
    return null;
  }
}

function balanceLine(accInfo) {
  if (!accInfo) return '';
  return `\n💼 Remaining (${accInfo.name}): <b>${fmt(accInfo.balance)}</b>`;
}

async function notifyInvoiceCreated(invoice) {
  if (!(await isEventEnabled('invoice_created'))) return;
  const customer = invoice.customer?.name || 'Unknown';
  const total = fmt(invoice.totalAmount);
  await sendTelegramMessage(
    `🧾 <b>Invoice Created</b>\nInvoice: <b>${invoice.invoiceNo}</b>\nCustomer: ${customer}\nAmount: <b>${total}</b>\n🕐 ${now()}`
  );
}

async function notifyInvoicePayment(invoice, amount, accountName, accountId) {
  if (!(await isEventEnabled('invoice_payment'))) return;
  const accInfo = accountId ? await getAccountBalance(accountId) : null;
  await sendTelegramMessage(
    `💰 <b>Payment Received</b>\nInvoice: <b>${invoice.invoiceNo}</b>\nAmount: <b>${fmt(amount)}</b>\nAccount: ${accountName}\nStatus: ${invoice.status}${balanceLine(accInfo)}\n🕐 ${now()}`
  );
}

async function notifyTransfer(fromAccount, toAccount, amount, note, fromAccountId, toAccountId) {
  if (!(await isEventEnabled('account_transfer'))) return;
  const [fromInfo, toInfo] = await Promise.all([
    fromAccountId ? getAccountBalance(fromAccountId) : null,
    toAccountId ? getAccountBalance(toAccountId) : null,
  ]);
  let balLines = '';
  if (fromInfo) balLines += `\n💼 ${fromInfo.name}: <b>${fmt(fromInfo.balance)}</b>`;
  if (toInfo) balLines += `\n💼 ${toInfo.name}: <b>${fmt(toInfo.balance)}</b>`;
  await sendTelegramMessage(
    `🔄 <b>Account Transfer</b>\nFrom: ${fromAccount} → To: ${toAccount}\nAmount: <b>${fmt(amount)}</b>${note ? `\nNote: ${note}` : ''}${balLines}\n🕐 ${now()}`
  );
}

async function notifyExpense(amount, description, category, account, accountId) {
  if (!(await isEventEnabled('expense_added'))) return;
  const accInfo = accountId ? await getAccountBalance(accountId) : null;
  await sendTelegramMessage(
    `💸 <b>Expense Added</b>\nDescription: ${description}\nCategory: ${category}\nAmount: <b>${fmt(amount)}</b>\nAccount: ${account}${balanceLine(accInfo)}\n🕐 ${now()}`
  );
}

async function notifySupplierPayment(supplierName, amount, accountName, accountId) {
  if (!(await isEventEnabled('supplier_payment'))) return;
  const accInfo = accountId ? await getAccountBalance(accountId) : null;
  await sendTelegramMessage(
    `📦 <b>Supplier Payment</b>\nSupplier: ${supplierName}\nAmount: <b>${fmt(amount)}</b>\nAccount: ${accountName}${balanceLine(accInfo)}\n🕐 ${now()}`
  );
}

async function notifySalaryPaid(employeeName, netSalary, accountName, accountId) {
  if (!(await isEventEnabled('salary_paid'))) return;
  const accInfo = accountId ? await getAccountBalance(accountId) : null;
  await sendTelegramMessage(
    `👷 <b>Salary Paid</b>\nEmployee: ${employeeName}\nNet Salary: <b>${fmt(netSalary)}</b>\nAccount: ${accountName || '—'}${balanceLine(accInfo)}\n🕐 ${now()}`
  );
}

async function notifyAdvance(employeeName, amount, accountName, accountId) {
  if (!(await isEventEnabled('advance_given'))) return;
  const accInfo = accountId ? await getAccountBalance(accountId) : null;
  await sendTelegramMessage(
    `💳 <b>Advance Given</b>\nEmployee: ${employeeName}\nAmount: <b>${fmt(amount)}</b>\nAccount: ${accountName || '—'}${balanceLine(accInfo)}\n🕐 ${now()}`
  );
}

async function notifyCourierPayment(source, netReceived, charge, accountName, accountId) {
  if (!(await isEventEnabled('courier_payment'))) return;
  const accInfo = accountId ? await getAccountBalance(accountId) : null;
  const src = source === 'leopard' ? '🚚 Leopard' : '📬 LAAM';
  await sendTelegramMessage(
    `${src} <b>Payment Received</b>\nNet Amount: <b>${fmt(netReceived)}</b>${charge ? `\nCharges Deducted: ${fmt(charge)}` : ''}\nAccount: ${accountName || '—'}${balanceLine(accInfo)}\n🕐 ${now()}`
  );
}

async function notifyVendorPayment(vendorName, amount, type, jobCollection, accountName, accountId) {
  if (!(await isEventEnabled('vendor_payment'))) return;
  const accInfo = accountId ? await getAccountBalance(accountId) : null;
  const label = type === 'advance' ? '💳 Vendor Advance' : '🏭 Vendor Payment';
  await sendTelegramMessage(
    `${label}\nVendor: <b>${vendorName}</b>\nAmount: <b>${fmt(amount)}</b>${jobCollection ? `\nJob: ${jobCollection}` : ''}\nAccount: ${accountName}${balanceLine(accInfo)}\n🕐 ${now()}`
  );
}

async function notifyStockOut(articleName, variantInfo, sku) {
  if (!(await isEventEnabled('stock_out'))) return;
  await sendTelegramMessage(
    `⚠️ <b>Stock Alert — Out of Stock</b>\nArticle: ${articleName}\nVariant: ${variantInfo}\nSKU: ${sku}\n🕐 ${now()}`
  );
}

module.exports = {
  sendTelegramMessage,
  sendTelegramDocument,
  notifyInvoiceCreated,
  notifyInvoicePayment,
  notifyTransfer,
  notifyExpense,
  notifySupplierPayment,
  notifySalaryPaid,
  notifyAdvance,
  notifyCourierPayment,
  notifyVendorPayment,
  notifyStockOut,
};
