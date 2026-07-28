import { useEffect, useState, useCallback } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { api } from '../api.js';
import { fullDateLabel, buildDayCopyText, copyToClipboard } from '../history.js';
import { sumFlows, fmtMoney, categoryLabel } from '../finance.js';
import TransactionList from './TransactionList.jsx';
import EditTransactionModal from './EditTransactionModal.jsx';

export default function DayDetailModal({ date, targets, onClose, onChanged }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const data = await api.getTransactions({ date });
    setTransactions(data);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveEdit(form) {
    await api.updateTransaction(form.id, form);
    setEditing(null);
    await load();
    onChanged?.();
  }

  async function handleDelete(tx) {
    if (!window.confirm(`Remove ${tx.description || categoryLabel(tx.category)}?`)) return;
    await api.deleteTransaction(tx.id);
    await load();
    onChanged?.();
  }

  async function handleCopy() {
    const text = buildDayCopyText({ date, totals: sumFlows(transactions), transactions, currency: targets.currency });
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const totals = sumFlows(transactions);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{fullDateLabel(date)}</h2>
          <div style={{ display: 'flex', gap: 4 }}>
            {!loading && (
              <button className="icon-btn" onClick={handleCopy} aria-label="Copy day to clipboard">
                {copied ? <Check size={18} color="var(--accent)" /> : <Copy size={18} />}
              </button>
            )}
            <button className="icon-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="sheet-body">
          {loading ? (
            <div className="empty-state">
              <div className="spinner" style={{ margin: '0 auto 10px' }} />
              Loading…
            </div>
          ) : (
            <>
              <div className="glass-card">
                <div className="day-totals">
                  <div className="day-total">
                    <div className="balance-metric-label">Income</div>
                    <div className="day-total-value" style={{ color: 'var(--income)' }}>{fmtMoney(totals.income, targets.currency)}</div>
                  </div>
                  <div className="day-total">
                    <div className="balance-metric-label">Spending</div>
                    <div className="day-total-value" style={{ color: 'var(--expense)' }}>{fmtMoney(totals.expenses, targets.currency)}</div>
                  </div>
                  <div className="day-total">
                    <div className="balance-metric-label">Net</div>
                    <div className="day-total-value" style={{ color: totals.net >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                      {fmtMoney(totals.net, targets.currency, { sign: true })}
                    </div>
                  </div>
                </div>
              </div>
              <TransactionList
                transactions={transactions}
                currency={targets.currency}
                onEdit={setEditing}
                onDelete={handleDelete}
              />
            </>
          )}
        </div>
      </div>
      {editing && <EditTransactionModal transaction={editing} onClose={() => setEditing(null)} onSave={handleSaveEdit} />}
    </div>
  );
}
