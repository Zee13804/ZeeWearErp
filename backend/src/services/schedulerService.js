const cron = require('node-cron');
const { sendDailyReport } = require('./dailyReportService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let scheduledTask = null;

async function getReportTime() {
  try {
    const s = await prisma.appSetting.findUnique({ where: { key: 'daily_report_time' } });
    return s ? s.value : '23:00';
  } catch {
    return '23:00';
  }
}

function buildCronExpression(timeStr) {
  const [h, m] = (timeStr || '23:00').split(':');
  return `${parseInt(m || 0)} ${parseInt(h || 23)} * * *`;
}

async function startScheduler() {
  const time = await getReportTime();
  const cronExpr = buildCronExpression(time);

  if (scheduledTask) scheduledTask.stop();

  scheduledTask = cron.schedule(cronExpr, async () => {
    try {
      const enabled = await prisma.appSetting.findUnique({ where: { key: 'notif_daily_report' } });
      if (enabled && enabled.value === 'false') {
        console.log('[Scheduler] Daily report disabled, skipping.');
        return;
      }
    } catch {}
    console.log('[Scheduler] Running daily report...');
    await sendDailyReport();
  }, { timezone: 'Asia/Karachi' });

  console.log(`[Scheduler] Daily report scheduled at ${time} (PKT)`);
}

async function restartScheduler() {
  await startScheduler();
}

module.exports = { startScheduler, restartScheduler };
