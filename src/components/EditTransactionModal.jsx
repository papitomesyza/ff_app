import { useState } from 'react';
import { X } from 'lucide-react';
import { useCategories, categoriesOfType, categoryLabel } from '../categories.js';

const TYPES = [
  { id: 'expense', label: 'Expense' },
  { id: 'income', label: 'Income' },
];

export default function EditTransactionModal({ transaction, onClose, onSave }) {
  const [form, setForm] = useState({ ...transaction });
  const [saving, setSaving] = useState(false);

  const allCategories = useCategories();
  const categories = categoriesOfType(allCategories, form.type);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function switchType(nextType) {
    // Reset the category when crossing income/expense — the old one no longer applies.
    const next = categoriesOfType(allCategories, nextType);
    setForm((f) => ({ ...f, type: nextType, category: next[0]?.id || '' }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ ...form, amount: Number(form.amount) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Edit transaction</h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="sheet-body">
          <div className="segmented" style={{ marginBottom: 14 }}>
            {TYPES.map((t) => (
              <button key={t.id} className={form.type === t.id ? 'active' : ''} onClick={() => switchType(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="field">
            <label>Category</label>
            <select value={form.category} onChange={(e) => setField('category', e.target.value)}>
              {/* Keep a category the list no longer offers (deleted, or set by an
                  integration) selectable so editing can't silently re-file it. */}
              {!categories.some((c) => c.id === form.category) && (
                <option value={form.category}>{categoryLabel(allCategories, form.category)}</option>
              )}
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Description</label>
            <input value={form.description} onChange={(e) => setField('description', e.target.value)} />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Amount</label>
              <input type="number" inputMode="decimal" min="0" step="0.01" value={form.amount} onChange={(e) => setField('amount', e.target.value)} />
            </div>
            <div className="field">
              <label>Date</label>
              <input type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary btn-block" disabled={saving || !(Number(form.amount) > 0)} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
