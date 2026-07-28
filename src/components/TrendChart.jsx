import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatDateLabel, formatWeekdayShort, fmtMoney } from '../finance.js';

function makeTooltip(currency) {
  return function CustomTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="chart-tooltip">
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{formatDateLabel(label)}</div>
        {payload.map((p) => (
          <div key={p.dataKey}>
            {p.name}: {fmtMoney(p.value, currency)}
          </div>
        ))}
      </div>
    );
  };
}

// days: [{ date, totals: { income, expenses, net } }]. Ticks show short
// weekday labels for week ranges (<=7 days) and day-of-month otherwise.
export default function TrendChart({ days, currency, compactTicks = false }) {
  const data = days.map((d) => ({ date: d.date, Income: d.totals.income, Spending: d.totals.expenses }));
  const tickFormatter = compactTicks
    ? (d) => String(Number(d.slice(-2)))
    : formatWeekdayShort;
  const CustomTooltip = makeTooltip(currency);

  return (
    <>
      <div className="glass-card">
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8, fontWeight: 700 }}>INCOME</div>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={data}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} interval={compactTicks ? 4 : 0} />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-strong)' }} />
            <Bar dataKey="Income" fill="var(--income)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card">
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8, fontWeight: 700 }}>SPENDING</div>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={data}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} interval={compactTicks ? 4 : 0} />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-strong)' }} />
            <Bar dataKey="Spending" fill="var(--expense)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
