const { PrismaClient } = require('@prisma/client');
const { restartScheduler } = require('../services/schedulerService');
const { sendTelegramMessage } = require('../services/notificationService');
const { sendDailyReport } = require('../services/dailyReportService');
const prisma = new PrismaClient();

const KEY_MAP = {
  telegramBotToken:      'telegram_bot_token',
  telegramChatId:        'telegram_chat_id',
  dailyReportTime:       'daily_report_time',
  notifyInvoiceCreated:  'notif_invoice_created',
  notifyInvoicePayment:  'notif_invoice_payment',
  notifyTransfer:        'notif_account_transfer',
  notifyExpense:         'notif_expense_added',
  notifySupplierPayment: 'notif_supplier_payment',
  notifySalaryPaid:      'notif_salary_paid',
  notifyAdvance:         'notif_advance_given',
  notifyCourierPayment:  'notif_courier_payment',
  notifyDailyReport:     'notif_daily_report',
};

const DB_KEYS = Object.values(KEY_MAP);

function boolStr(val) {
  if (val === true || val === 'true') return 'true';
  if (val === false || val === 'false') return 'false';
  return String(val);
}

const getSettings = async (req, res) => {
  try {
    const rows = await prisma.appSetting.findMany({ where: { key: { in: DB_KEYS } } });
    const db = {};
    rows.forEach(r => { db[r.key] = r.value; });

    const result = {};
    for (const [camel, snake] of Object.entries(KEY_MAP)) {
      let val = db[snake] ?? null;
      if (camel === 'telegramBotToken' && val) {
        val = val.replace(/^(.{6}).*(.{4})$/, '$1****$2');
      }
      if (['notifyInvoiceCreated','notifyInvoicePayment','notifyTransfer','notifyExpense','notifySupplierPayment','notifySalaryPaid','notifyAdvance','notifyCourierPayment','notifyDailyReport'].includes(camel)) {
        result[camel] = val !== 'false';
      } else {
        result[camel] = val;
      }
    }
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch settings', details: err.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    const body = req.body;
    let timeChanged = false;

    for (const [camel, snake] of Object.entries(KEY_MAP)) {
      if (!(camel in body)) continue;
      const value = boolStr(body[camel]);
      await prisma.appSetting.upsert({
        where: { key: snake },
        update: { value },
        create: { key: snake, value },
      });
      if (camel === 'dailyReportTime') timeChanged = true;
    }

    if (timeChanged) await restartScheduler();
    return res.json({ message: 'Settings saved' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save settings', details: err.message });
  }
};

const testNotification = async (req, res) => {
  try {
    await sendTelegramMessage(
      `✅ <b>Test Notification</b>\nZeeWear ERP notifications are working!\n🕐 ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi', hour12: true })}`
    );
    return res.json({ message: 'Test notification sent successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send test notification', details: err.message });
  }
};

const sendReportNow = async (req, res) => {
  try {
    sendDailyReport().catch(e => console.error('[Report] Error:', e.message));
    return res.json({ message: 'Daily report is being generated and sent' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send report', details: err.message });
  }
};

module.exports = { getSettings, updateSettings, testNotification, sendReportNow };
