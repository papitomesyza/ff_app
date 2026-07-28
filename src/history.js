import { TYPE_ORDER, TYPE_LABELS, fmtMoney } from './finance.js';
import { categoryLabel } from './categories.js';

// Spending is a ceiling: within budget at or below it, over otherwise.
// With nothing logged there's nothing to judge — "unknown", not "within".
export function spendingStatus(spent, budget, loggedDays = 1) {
  if (!budget || budget <= 0 || !loggedDays) return { status: 'unknown', delta: 0 };
  const delta = spent - budget;
  return { status: delta > 0 ? 'over' : 'within', delta: Math.round(delta * 100) / 100 };
}

// Net flow: surplus at or above zero, deficit below.
export function netStatus(net, loggedDays = 1) {
  if (!loggedDays) return { status: 'unknown', delta: 0 };
  return { status: net >= 0 ? 'surplus' : 'deficit', delta: Math.round(net * 100) / 100 };
}

export const STATUS_LABEL = {
  within: 'Within budget',
  over: 'Over budget',
  surplus: 'Surplus',
  deficit: 'Deficit',
  unknown: 'No data',
};
export const STATUS_COLOR = {
  within: 'var(--income)',
  surplus: 'var(--income)',
  over: 'var(--expense)',
  deficit: 'var(--expense)',
  unknown: 'var(--text-faint)',
};

export function monthLabel(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function monthShortLabel(monthNum, year) {
  return new Date(Date.UTC(year, monthNum - 1, 1)).toLocaleDateString(undefined, { month: 'long', timeZone: 'UTC' });
}

export function weekLabel(start, end) {
  const startD = new Date(`${start}T00:00:00`);
  const endD = new Date(`${end}T00:00:00`);
  const startStr = startD.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endStr = endD.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startStr} – ${endStr}`;
}

export function fullDateLabel(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function totalsLine(totals, currency) {
  return `In ${fmtMoney(totals.income, currency)} · Out ${fmtMoney(totals.expenses, currency)} · Net ${fmtMoney(totals.net, currency, { sign: true })}`;
}

// --- Copy-to-plain-text builders -------------------------------------------
// Plain, readable text meant for pasting into notes/messages — not CSV/JSON.

export function buildDayCopyText({ date, totals, transactions, currency, categories }) {
  const lines = [fullDateLabel(date), '', totalsLine(totals, currency)];

  const grouped = {};
  for (const type of TYPE_ORDER) grouped[type] = [];
  for (const t of transactions) {
    if (!grouped[t.type]) grouped[t.type] = [];
    grouped[t.type].push(t);
  }

  for (const type of TYPE_ORDER) {
    const typeTransactions = grouped[type];
    if (!typeTransactions.length) continue;
    lines.push('', TYPE_LABELS[type]);
    for (const t of typeTransactions) {
      const label = categoryLabel(categories, t.category);
      const name = t.description || label;
      lines.push(`- ${name} (${label}) — ${fmtMoney(t.amount, currency)}`);
    }
  }

  return lines.join('\n');
}

export function buildMonthCopyText({ label, loggedDays, totals, targets, days, currency }) {
  const lines = [label, '', `${loggedDays} day${loggedDays === 1 ? '' : 's'} with activity`];

  if (loggedDays === 0) {
    lines.push('No transactions this month.');
    return lines.join('\n');
  }

  const spend = spendingStatus(totals.expenses, targets.spending_budget, loggedDays);
  const net = netStatus(totals.net, loggedDays);
  lines.push(
    `Income: ${fmtMoney(totals.income, currency)} vs ${fmtMoney(targets.income_target, currency)} target`,
    `Spending: ${fmtMoney(totals.expenses, currency)} vs ${fmtMoney(targets.spending_budget, currency)} budget — ${STATUS_LABEL[spend.status]} (${fmtMoney(spend.delta, currency, { sign: true })})`,
    `Net: ${fmtMoney(totals.net, currency, { sign: true })} — ${STATUS_LABEL[net.status]}`,
    '',
  );

  for (const d of days.filter((d) => d.entryCount > 0)) {
    lines.push(`${d.date}: in ${fmtMoney(d.totals.income, currency)}, out ${fmtMoney(d.totals.expenses, currency)}, net ${fmtMoney(d.totals.net, currency, { sign: true })}`);
  }

  return lines.join('\n');
}

export function buildYearCopyText({ year, months, targets, currency }) {
  const lines = [String(year), ''];

  for (const m of months) {
    const label = monthShortLabel(m.month, year);
    if (m.loggedDays === 0) {
      lines.push(`${label}: no transactions`);
      continue;
    }
    const spend = spendingStatus(m.totals.expenses, targets.spending_budget, m.loggedDays);
    lines.push(
      `${label}: in ${fmtMoney(m.totals.income, currency)}, out ${fmtMoney(m.totals.expenses, currency)} (${STATUS_LABEL[spend.status]}), `
      + `net ${fmtMoney(m.totals.net, currency, { sign: true })} — ${m.loggedDays} day${m.loggedDays === 1 ? '' : 's'} with activity`
    );
  }

  return lines.join('\n');
}

export async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
}

// Pure calendar-date arithmetic (UTC-anchored so the browser's local
// timezone never leaks in) — used only to page an already-resolved range
// forward/back by a day. The server resolves what week/month/year that
// lands in, so no "today" computation is needed on the client.
export function addDaysStr(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

// Paging a resolved range: the day after its end / the day before its start
// always lands in the next/previous week, month, or year respectively.
export function nextRangeAnchor(range) {
  return addDaysStr(range.end, 1);
}

export function prevRangeAnchor(range) {
  return addDaysStr(range.start, -1);
}

// 1 = Monday .. 7 = Sunday, for building a Monday-start calendar grid.
export function isoWeekdayOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 ? 7 : day;
}
