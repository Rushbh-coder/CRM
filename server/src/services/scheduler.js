const cron = require('node-cron');
const { runAll } = require('./automation');

function startScheduler() {
  if (String(process.env.AUTOMATION_ENABLED || 'true') !== 'true') {
    console.log('[automation] Daily emails are turned off (AUTOMATION_ENABLED=false).');
    return;
  }
  const expr = process.env.AUTOMATION_CRON || '0 9 * * *';
  const timezone = process.env.TZ_NAME || 'Asia/Kolkata';
  if (!cron.validate(expr)) {
    console.error(`[automation] AUTOMATION_CRON "${expr}" is not a valid schedule. Daily emails are off.`);
    return;
  }
  cron.schedule(expr, () => {
    runAll().catch((e) => console.error('[automation] run failed:', e.message));
  }, { timezone });
  console.log(`[automation] Daily emails scheduled: "${expr}" (${timezone}).`);
}

module.exports = { startScheduler };
