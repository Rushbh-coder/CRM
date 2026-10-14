// Date helpers. Date-only fields (follow-ups, due dates, calendar dates) are stored
// as "YYYY-MM-DD" strings so they never shift between time zones.
const TZ = () => process.env.TZ_NAME || 'Asia/Kolkata';

function todayIn(tz = TZ()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function dateOf(value, tz = TZ()) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (isNaN(d)) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

const DATE_RE = /^(\d{4}-\d{2}-\d{2})?$/;

module.exports = { todayIn, addDays, dateOf, DATE_RE, TZ };
