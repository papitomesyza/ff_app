import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { spendingStatus, netStatus, STATUS_LABEL, STATUS_COLOR, monthShortLabel, buildYearCopyText, copyToClipboard } from '../history.js';
import { fmtMoney } from '../finance.js';

export default function YearView({ range, targets, onMonthClick }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const text = buildYearCopyText({ year: range.year, months: range.months, targets, currency: targets.currency });
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div>
      <div className="glass-card">
        {range.months.map((m) => {
          const label = monthShortLabel(m.month, range.year);
          if (m.loggedDays === 0) {
            return (
              <div className="year-month-row" key={m.month} onClick={() => onMonthClick(m.start)}>
                <span className="year-month-name">{label}</span>
                <div className="year-month-stats">
                  <div className="year-month-status" style={{ color: STATUS_COLOR.unknown }}>No transactions</div>
                </div>
              </div>
            );
          }
          const spend = spendingStatus(m.totals.expenses, targets.spending_budget, m.loggedDays);
          const net = netStatus(m.totals.net, m.loggedDays);
          return (
            <div className="year-month-row" key={m.month} onClick={() => onMonthClick(m.start)}>
              <span className="year-month-name">{label}</span>
              <div className="year-month-stats">
                <div className="year-month-status" style={{ color: STATUS_COLOR[net.status] }}>
                  {fmtMoney(m.totals.net, targets.currency, { sign: true })} · {STATUS_LABEL[net.status]}
                </div>
                <div className="year-month-meta">
                  in {fmtMoney(m.totals.income, targets.currency)} · out {fmtMoney(m.totals.expenses, targets.currency)} ({STATUS_LABEL[spend.status]})
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button className="copy-btn" onClick={handleCopy}>
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? 'Copied' : 'Copy year summary'}
      </button>
    </div>
  );
}
