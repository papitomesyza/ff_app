import { useState } from 'react';
import { X } from 'lucide-react';
import { categoriesFor, todayISO } from '../finance.js';

const TYPES = [
  { id: 'expense', label: 'Expense' },
  { id: 'income', label: 'Income' },
];

export default function AddSheet({ defaultType = 'expense', onClose, onLogged }) {
  const [type, setType] = useState(defaultType);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const categories = categoriesFor(type);
  const canSave = category && Number(amount) > 0 && date;

  function switchType(nextType) {
    setType(nextType);
    setCategory('');
  }

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      await onLogged({ type, category, description: description.trim(), amount: Number(amount), date });
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save transaction.');
      setSaving(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Add transaction</h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="sheet-body">
          <div className="segmented" style={{ marginBottom: 14 }}>
            {TYPES.map((t) => (
              <button key={t.id} className={type === t.id ? 'active' : ''} onClick={() => switchType(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="field">
            <label>Category</label>
            <div className="chip-row">
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={`chip ${category === c.id ? 'active' : ''}`}
                  onClick={() => setCategory(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Amount</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Description (optional)</label>
            <input
              placeholder={type === 'income' ? 'e.g. July salary' : 'e.g. Groceries at the market'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}

          <button className="btn btn-primary btn-block" disabled={saving || !canSave} onClick={handleSave}>
            {saving ? 'Saving…' : `Add ${type === 'income' ? 'income' : 'expense'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
