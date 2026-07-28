export const TYPE_ORDER = ['income', 'expense'];
export const TYPE_LABELS = { income: 'Income', expense: 'Expenses' };

// Categories are user-defined and live in the database — see categories.js for
// the client-side store and the label/color lookups.

export function sumFlows(transactions) {
  let income = 0;
  let expenses = 0;
  for (const t of transactions) {
    const amount = Number(t.amount) || 0;
    if (t.type === 'income') income += amount;
    else expenses += amount;
  }
  return { income, expenses, net: income - expenses };
}

// Expense totals per category, largest first.
export function expensesByCategory(transactions) {
  const buckets = {};
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    buckets[t.category] = (buckets[t.category] || 0) + (Number(t.amount) || 0);
  }
  return Object.entries(buckets)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function fmtMoney(value, currency = '$', { sign = false } = {}) {
  const n = Number(value) || 0;
  const abs = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const prefix = sign ? (n < 0 ? '−' : '+') : n < 0 ? '−' : '';
  return `${prefix}${currency}${abs}`;
}

export function todayISO() {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

export function formatDateLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatWeekdayShort(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}
