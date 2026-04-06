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

async function notifyInvoiceCreated(invoice) {
  if (!(await isEventEnabled('invoice_created'))) return;
  const customer = invoice.customer?.name || 'Unknown';
  const total = fmt(invoice.totalAmount);
  await sendTelegramMessage(
    `🧾 <b>Invoice Created</b>\nInvoice: <b>${invoice.invoiceNo}</b>\nCustomer: ${customer}\nAmount: <b>${total}</b>\n🕐 ${now()}`
  );
}

async function notifyInvoicePayment(invoice, amount, accountName) {
  if (!(await isEventEnabled('invoice_payment'))) return;
  await sendTelegramMessage(
    `💰 <b>Payment Received</b>\nInvoice: <b>${invoice.invoiceNo}</b>\nAmount: <b>${fmt(amount)}</b>\nAccount: ${accountName}\nStatus: ${invoice.status}\n🕐 ${now()}`
  );
}

async function notifyTransfer(fromAccount, toAccount, amount, note) {
  if (!(await isEventEnabled('account_transfer'))) return;
  await sendTelegramMessage(
    `🔄 <b>Account Transfer</b>\nFrom: ${fromAccount} → To: ${toAccount}\nAmount: <b>${fmt(amount)}</b>${note ? `\nNote: ${note}` : ''}\n🕐 ${now()}`
  );
}

async function notifyExpense(amount, description, category, account) {
  if (!(await isEventEnabled('expense_added'))) return;
  await sendTelegramMessage(
    `💸 <b>Expense Added</b>\nDescription: ${description}\nCategory: ${category}\nAmount: <b>${fmt(amount)}</b>\nAccount: ${account}\n🕐 ${now()}`
  );
}

async function notifySupplierPayment(supplierName, amount, accountName) {
  if (!(await isEventEnabled('supplier_payment'))) return;
  await sendTelegramMessage(
    `📦 <b>Supplier Payment</b>\nSupplier: ${supplierName}\nAmount: <b>${fmt(amount)}</b>\nAccount: ${accountName}\n🕐 ${now()}`
  );
}

async function notifySalaryPaid(employeeName, netSalary) {
  if (!(await isEventEnabled('salary_paid'))) return;
  await sendTelegramMessage(
    `👷 <b>Salary Paid</b>\nEmployee: ${employeeName}\nNet Salary: <b>${fmt(netSalary)}</b>\n🕐 ${now()}`
  );
}

async function notifyAdvance(employeeName, amount) {
  if (!(await isEventEnabled('advance_given'))) return;
  await sendTelegramMessage(
    `💳 <b>Advance Given</b>\nEmployee: ${employeeName}\nAmount: <b>${fmt(amount)}</b>\n🕐 ${now()}`
  );
}

async function notifyCourierPayment(source, netReceived, charge) {
  if (!(await isEventEnabled('courier_payment'))) return;
  const src = source === 'leopard' ? '🚚 Leopard' : '📬 LAAM';
  await sendTelegramMessage(
    `${src} <b>Payment Received</b>\nNet Amount: <b>${fmt(netReceived)}</b>${charge ? `\nCharges Deducted: ${fmt(charge)}` : ''}\n🕐 ${now()}`
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
  notifyStockOut,
};
