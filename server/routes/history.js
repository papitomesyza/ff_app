import { Router } from 'express';
import db from '../db.js';
import { todayInPristina, weekRange, monthRange, yearRange, yearOf, eachDateInRange } from '../lib/tz.js';

const router = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function emptyTotals() {
  return { income: 0, expenses: 0, net: 0 };
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function fetchTransactionsInRange(start, end) {
  return db.prepare('SELECT * FROM transactions WHERE date BETWEEN ? AND ?').all(start, end);
}

// { 'YYYY-MM-DD': { totals: {income, expenses, net}, entryCount } } — this is
// the read-only aggregation boundary; nothing here writes to or reshapes the
// transactions table.
function groupByDate(transactions) {
  const byDate = {};
  for (const t of transactions) {
    if (!byDate[t.date]) byDate[t.date] = { totals: emptyTotals(), entryCount: 0 };
    const bucket = byDate[t.date];
    if (t.type === 'income') bucket.totals.income += t.amount;
    else bucket.totals.expenses += t.amount;
    bucket.entryCount += 1;
  }
  for (const date of Object.keys(byDate)) {
    const t = byDate[date].totals;
    t.income = round2(t.income);
    t.expenses = round2(t.expenses);
    t.net = round2(t.income - t.expenses);
  }
  return byDate;
}

function computeTotals(byDate, dateFilter) {
  const dates = Object.keys(byDate).filter(dateFilter || (() => true));
  const loggedDays = dates.length;
  const totals = emptyTotals();
  for (const date of dates) {
    totals.income += byDate[date].totals.income;
    totals.expenses += byDate[date].totals.expenses;
  }
  totals.income = round2(totals.income);
  totals.expenses = round2(totals.expenses);
  totals.net = round2(totals.income - totals.expenses);
  return { loggedDays, totals };
}

function buildDaySeries(start, end, byDate) {
  return eachDateInRange(start, end).map((date) => {
    const bucket = byDate[date];
    return {
      date,
      entryCount: bucket ? bucket.entryCount : 0,
      totals: bucket ? bucket.totals : emptyTotals(),
    };
  });
}

// GET /api/history/range?scope=week|month|year&date=YYYY-MM-DD
// `date` is an anchor within the desired week/month/year; omit it to get the
// current one (computed in Pristina local time). Read-only: aggregates the
// existing transactions table, never writes to it.
router.get('/range', (req, res) => {
  const scope = String(req.query.scope || 'week');
  const anchor = String(req.query.date || '').trim() || todayInPristina();

  if (!DATE_RE.test(anchor)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  }

  if (scope === 'week' || scope === 'month') {
    const { start, end } = scope === 'week' ? weekRange(anchor) : monthRange(anchor);
    const byDate = groupByDate(fetchTransactionsInRange(start, end));
    const { loggedDays, totals } = computeTotals(byDate);
    const days = buildDaySeries(start, end, byDate);
    return res.json({ scope, start, end, loggedDays, totals, days });
  }

  if (scope === 'year') {
    const year = yearOf(anchor);
    const { start, end } = yearRange(year);
    const byDate = groupByDate(fetchTransactionsInRange(start, end));
    const { loggedDays, totals } = computeTotals(byDate);

    const months = [];
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, '0');
      const prefix = `${year}-${mm}-`;
      const { start: monthStart, end: monthEnd } = monthRange(`${year}-${mm}-01`);
      const monthAgg = computeTotals(byDate, (d) => d.startsWith(prefix));
      months.push({ month: m, start: monthStart, end: monthEnd, loggedDays: monthAgg.loggedDays, totals: monthAgg.totals });
    }
    return res.json({ scope, year, start, end, loggedDays, totals, months });
  }

  return res.status(400).json({ error: 'scope must be week, month, or year' });
});

export default router;
