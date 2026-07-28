import { formatDateLabel, fmtMoney } from '../finance.js';
import TrendChart from './TrendChart.jsx';

export default function WeekView({ range, currency, onDateClick }) {
  return (
    <div>
      <TrendChart days={range.days} currency={currency} />
      <div className="glass-card">
        {[...range.days].reverse().map((d) => (
          <div className="history-day-row" key={d.date} onClick={() => onDateClick(d.date)}>
            <span>{formatDateLabel(d.date)}</span>
            {d.entryCount > 0 ? (
              <span style={{ color: d.totals.net >= 0 ? 'var(--income)' : 'var(--expense)', fontWeight: 600 }}>
                {fmtMoney(d.totals.net, currency, { sign: true })}
              </span>
            ) : (
              <span>—</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
