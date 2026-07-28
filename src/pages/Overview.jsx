import { useEffect, useState, useCallback } from 'react';
import { Plus, TrendingUp, PieChart } from 'lucide-react';
import { api } from '../api.js';
import { sumFlows, expensesByCategory, fmtMoney, todayISO } from '../finance.js';
import { useCategories, categoryLabel, categoryColor } from '../categories.js';
import FlowRing from '../components/FlowRing.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import TransactionList from '../components/TransactionList.jsx';
import EditTransactionModal from '../components/EditTransactionModal.jsx';
import AddSheet from '../components/AddSheet.jsx';

function monthBounds(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  const mm = String(m).padStart(2, '0');
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(daysInMonth).padStart(2, '0')}` };
}

export default function Overview() {
  const [transactions, setTransactions] = useState([]);
  const [targets, setTargets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const categories = useCategories();
  const { from, to } = monthBounds(todayISO());

  const load = useCallback(async () => {
    const [txData, targetsData] = await Promise.all([api.getTransactions({ from, to }), api.getTargets()]);
    // Newest first inside the list groups.
    setTransactions([...txData].reverse());
    setTargets(targetsData);
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLogged(tx) {
    await api.createTransaction(tx);
    await load();
  }

  async function handleSaveEdit(form) {
    await api.updateTransaction(form.id, form);
    setEditing(null);
    await load();
  }

  async function handleDelete(tx) {
    if (!window.confirm(`Remove ${tx.description || categoryLabel(categories, tx.category)}?`)) return;
    await api.deleteTransaction(tx.id);
    await load();
  }

  if (loading || !targets) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="spinner" style={{ margin: '0 auto 10px' }} />
          Loading…
        </div>
      </div>
    );
  }

  const totals = sumFlows(transactions);
  const saved = Math.max(totals.net, 0);
  const breakdown = expensesByCategory(transactions);
  const currency = targets.currency;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <h1>This Month</h1>
        </div>
      </div>

      <div className="glass-card">
        <div className="card-header" style={{ color: 'var(--accent)' }}>
          <TrendingUp size={16} />
          Cash Flow
        </div>
        <div className="rings-grid">
          <FlowRing label="Income" value={totals.income} target={targets.income_target} currency={currency} color="var(--income)" />
          <FlowRing label="Spending" value={totals.expenses} target={targets.spending_budget} currency={currency} color="var(--expense)" />
        </div>
        <div className="net-row">
          <span className="balance-metric-label" style={{ marginBottom: 0 }}>Net balance</span>
          <span className="net-value" style={{ color: totals.net >= 0 ? 'var(--income)' : 'var(--expense)' }}>
            {fmtMoney(totals.net, currency, { sign: true })}
          </span>
        </div>
        <ProgressBar
          label="Savings goal"
          valueLabel={fmtMoney(saved, currency)}
          targetLabel={`/ ${fmtMoney(targets.savings_target, currency)}`}
          pct={targets.savings_target > 0 ? (saved / targets.savings_target) * 100 : 0}
          color="var(--accent)"
        />
      </div>

      {breakdown.length > 0 && (
        <div className="glass-card">
          <div className="card-header" style={{ color: 'var(--expense)' }}>
            <PieChart size={16} />
            Spending by category
          </div>
          {breakdown.map(({ category, amount }) => (
            <ProgressBar
              key={category}
              label={categoryLabel(categories, category)}
              valueLabel={fmtMoney(amount, currency)}
              targetLabel={totals.expenses > 0 ? `· ${Math.round((amount / totals.expenses) * 100)}%` : ''}
              pct={totals.expenses > 0 ? (amount / totals.expenses) * 100 : 0}
              color={categoryColor(categories, category, 'var(--expense)')}
            />
          ))}
        </div>
      )}

      <TransactionList
        transactions={transactions}
        currency={currency}
        showDates
        onEdit={setEditing}
        onDelete={handleDelete}
      />

      <button className="fab" onClick={() => setShowAdd(true)} aria-label="Add transaction">
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {showAdd && <AddSheet onClose={() => setShowAdd(false)} onLogged={handleLogged} />}
      {editing && (
        <EditTransactionModal transaction={editing} onClose={() => setEditing(null)} onSave={handleSaveEdit} />
      )}
    </div>
  );
}
