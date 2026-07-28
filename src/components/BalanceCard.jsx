import { netStatus, STATUS_LABEL, STATUS_COLOR } from '../history.js';
import { fmtMoney } from '../finance.js';

export default function BalanceCard({ title, loading, loggedDays, totals, currency }) {
  const ready = !loading && totals;
  const net = ready ? netStatus(totals.net, loggedDays) : null;

  return (
    <div className="glass-card balance-card">
      <div className="balance-card-head">
        <div className="balance-card-title">{title}</div>
        {ready && (
          <div className="balance-logged-days">{loggedDays} active day{loggedDays === 1 ? '' : 's'}</div>
        )}
      </div>

      {!ready ? (
        <div className="spinner" style={{ margin: '18px auto' }} />
      ) : (
        <>
          <div className="balance-metrics">
            <div className="balance-metric">
              <div className="balance-metric-label">Income</div>
              <div className="balance-metric-status" style={{ color: 'var(--income)' }}>
                {fmtMoney(totals.income, currency)}
              </div>
            </div>
            <div className="balance-metric">
              <div className="balance-metric-label">Spending</div>
              <div className="balance-metric-status" style={{ color: 'var(--expense)' }}>
                {fmtMoney(totals.expenses, currency)}
              </div>
            </div>
          </div>
          <div className="balance-net">
            <span className="balance-metric-label" style={{ marginBottom: 0 }}>Net</span>
            <span className="balance-net-value" style={{ color: STATUS_COLOR[net.status] }}>
              {net.status === 'unknown' ? '—' : `${fmtMoney(totals.net, currency, { sign: true })} · ${STATUS_LABEL[net.status]}`}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
