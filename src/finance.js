export const TYPE_ORDER = ['income', 'expense'];
export const TYPE_LABELS = { income: 'Income', expense: 'Expenses' };

// Fixed category presets, mirroring how the macros app fixes its meal list.
// The server accepts any category string, so this list can grow freely.
export const INCOME_CATEGORIES = [
  { id: 'salary', label: 'Salary' },
  { id: 'freelance', label: 'Freelance' },
  { id: 'investment', label: 'Investment' },
  { id: 'gift', label: 'Gift' },
  { id: 'other-income', label: 'Other' },
];

export const EXPENSE_CATEGORIES = [
  { id: 'housing', label: 'Housing' },
  { id: 'food', label: 'Food' },
  { id: 'transport', label: 'Transport' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'health', label: 'Health' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'travel', label: 'Travel' },
  { id: 'other-expense', label: 'Other' },
];

const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

// Per-category colors from Apple's dark-mode system palette (same family the
// macros app uses for nutrients).
export const CATEGORY_COLORS = {
  housing: '#0a84ff',
  food: '#ff9f0a',
  transport: '#64d2ff',
  utilities: '#ffd60a',
  health: '#ff375f',
  entertainment: '#bf5af2',
  shopping: '#ff9f0a',
  subscriptions: '#66d4cf',
  travel: '#30d158',
  'other-expense': '#98989d',
};

export function categoriesFor(type) {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function categoryLabel(id) {
  const cat = ALL_CATEGORIES.find((c) => c.id === id);
  return cat ? cat.label : id;
}

export function categoryColor(id) {
  return CATEGORY_COLORS[id] || 'var(--text-dim)';
}

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
