import { Pencil, Trash2 } from 'lucide-react';
import { TYPE_ORDER, TYPE_LABELS, categoryLabel, categoryColor, fmtMoney, formatDateLabel } from '../finance.js';

export default function TransactionList({ transactions, currency, showDates = false, onEdit, onDelete }) {
  if (!transactions.length) {
    return <div className="empty-state">Nothing logged yet. Tap the + button to add your first transaction.</div>;
  }

  const grouped = {};
  for (const type of TYPE_ORDER) grouped[type] = [];
  for (const t of transactions) {
    if (!grouped[t.type]) grouped[t.type] = [];
    grouped[t.type].push(t);
  }

  return (
    <div>
      {TYPE_ORDER.filter((type) => grouped[type].length).map((type) => {
        const typeTransactions = grouped[type];
        const typeTotal = typeTransactions.reduce((sum, t) => sum + t.amount, 0);
        return (
          <div className="meal-group" key={type}>
            <div className="meal-group-title">
              <span>{TYPE_LABELS[type]}</span>
              <span>{fmtMoney(typeTotal, currency)}</span>
            </div>
            <div className="glass-card">
              {typeTransactions.map((tx) => (
                <div className="entry-row" key={tx.id}>
                  <span className="cat-dot" style={{ background: tx.type === 'income' ? 'var(--income)' : categoryColor(tx.category) }} />
                  <div className="entry-info">
                    <div className="entry-name">{tx.description || categoryLabel(tx.category)}</div>
                    <div className="entry-meta">
                      {categoryLabel(tx.category)}
                      {showDates && ` · ${formatDateLabel(tx.date)}`}
                    </div>
                  </div>
                  <div className="entry-cals" style={{ color: tx.type === 'income' ? 'var(--income)' : 'var(--expense)' }}>
                    {tx.type === 'income' ? '+' : '−'}{fmtMoney(tx.amount, currency)}
                  </div>
                  <div className="entry-actions">
                    <button className="icon-btn" onClick={() => onEdit(tx)} aria-label="Edit transaction">
                      <Pencil size={16} />
                    </button>
                    <button className="icon-btn danger" onClick={() => onDelete(tx)} aria-label="Delete transaction">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
