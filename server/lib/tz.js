// Pristina-local (Europe/Belgrade IANA zone — Kosovo observes the same
// rules) calendar-boundary math for the History aggregation routes.
//
// The only genuinely timezone-sensitive operation is converting "right now"
// into a local calendar date — that's what Intl.DateTimeFormat below does,
// and it correctly follows Europe/Belgrade's DST transitions. Every other
// helper here operates on plain YYYY-MM-DD strings (the same format
// transactions.date already uses) and is pure calendar arithmetic — anchored
// on Date.UTC so the server's own local timezone never leaks in.

const TIME_ZONE = 'Europe/Belgrade';

const localDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Today's calendar date in Pristina local time, as YYYY-MM-DD.
export function todayInPristina() {
  return localDateFormatter.format(new Date());
}

function parts(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { y, m, d };
}

function toUTCDate(dateStr) {
  const { y, m, d } = parts(dateStr);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTCDate(dt) {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(dateStr, n) {
  const dt = toUTCDate(dateStr);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fromUTCDate(dt);
}

// ISO weekday: 1 = Monday .. 7 = Sunday.
function isoWeekday(dateStr) {
  const day = toUTCDate(dateStr).getUTCDay(); // 0 = Sunday .. 6 = Saturday
  return day === 0 ? 7 : day;
}

// Monday-to-Sunday week containing dateStr.
export function weekRange(dateStr) {
  const start = addDays(dateStr, -(isoWeekday(dateStr) - 1));
  return { start, end: addDays(start, 6) };
}

export function monthRange(dateStr) {
  const { y, m } = parts(dateStr);
  const mm = String(m).padStart(2, '0');
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${y}-${mm}-01`, end: `${y}-${mm}-${String(daysInMonth).padStart(2, '0')}` };
}

export function yearRange(year) {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function yearOf(dateStr) {
  return parts(dateStr).y;
}

// Inclusive list of every YYYY-MM-DD between start and end. Safe as plain
// string comparison since both are zero-padded ISO dates.
export function eachDateInRange(start, end) {
  const dates = [];
  let cur = start;
  while (cur <= end) {
    dates.push(cur);
    cur = addDays(cur, 1);
  }
  return dates;
}
