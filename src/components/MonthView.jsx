import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { isoWeekdayOf, buildMonthCopyText, copyToClipboard } from '../history.js';
import { todayISO } from '../finance.js';
import TrendChart from './TrendChart.jsx';

const WEEKDAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function MonthView({ range, targets, onDateClick }) {
  const [copied, setCopied] = useState(false);
  const leadingBlanks = isoWeekdayOf(range.start) - 1;
  const today = todayISO();

  async function handleCopy() {
    const text = buildMonthCopyText({
      label: new Date(`${range.start}T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      loggedDays: range.loggedDays,
      totals: range.totals,
      targets,
      days: range.days,
      currency: targets.currency,
    });
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div>
      <div className="glass-card">
        <div className="calendar-grid" style={{ marginBottom: 6 }}>
          {WEEKDAY_HEADERS.map((w, i) => (
            <div className="calendar-weekday" key={i}>{w}</div>
          ))}
        </div>
        <div className="calendar-grid">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {range.days.map((d) => {
            const dayNum = Number(d.date.slice(-2));
            const isToday = d.date === today;
            return (
              <div
                key={d.date}
                className={`calendar-cell in-range ${isToday ? 'today' : ''}`}
                onClick={() => onDateClick(d.date)}
              >
                <span>{dayNum}</span>
                {d.entryCount > 0 && (
                  <div className="calendar-dot" style={{ background: d.totals.net >= 0 ? 'var(--income)' : 'var(--expense)' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <TrendChart days={range.days} currency={targets.currency} compactTicks />

      <button className="copy-btn" onClick={handleCopy}>
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? 'Copied' : 'Copy month summary'}
      </button>
    </div>
  );
}
