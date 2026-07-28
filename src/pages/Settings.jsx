import { useEffect, useState } from 'react';
import { LogOut, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { api, setToken } from '../api.js';
import { useCategories, refreshCategories, categoriesOfType, CATEGORY_PALETTE } from '../categories.js';

const TARGET_FIELDS = [
  ['income_target', 'Monthly income target'],
  ['spending_budget', 'Monthly spending budget'],
  ['savings_target', 'Monthly savings goal'],
];

const CURRENCIES = ['$', '€', '£', 'CHF', 'kr', '¥'];

function TargetsSection() {
  const [targets, setTargets] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getTargets().then(setTargets);
  }, []);

  if (!targets) return null;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.setTargets(targets);
      setTargets(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-card">
      {TARGET_FIELDS.map(([key, label]) => (
        <div className="field" key={key}>
          <label>{label} ({targets.currency})</label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={targets[key]}
            onChange={(e) => setTargets((t) => ({ ...t, [key]: e.target.value }))}
          />
        </div>
      ))}
      <div className="field">
        <label>Currency</label>
        <select value={targets.currency} onChange={(e) => setTargets((t) => ({ ...t, currency: e.target.value }))}>
          {!CURRENCIES.includes(targets.currency) && <option value={targets.currency}>{targets.currency}</option>}
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <button className="btn btn-primary btn-block" disabled={saving} onClick={handleSave}>
        {saved ? 'Saved' : saving ? 'Saving…' : 'Save targets'}
      </button>
    </div>
  );
}

function CategoryForm({ initial, type, onCancel, onSave }) {
  const [label, setLabel] = useState(initial?.label || '');
  const [color, setColor] = useState(initial?.color || CATEGORY_PALETTE[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    setSaving(true);
    try {
      await onSave({ label: label.trim(), color, type });
    } catch (err) {
      setError(err.message || 'Could not save category.');
      setSaving(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{initial ? 'Edit category' : `New ${type} category`}</h2>
          <button className="icon-btn" onClick={onCancel}><X size={20} /></button>
        </div>
        <div className="sheet-body">
          <div className="field">
            <label>Name</label>
            <input
              autoFocus
              value={label}
              placeholder={type === 'income' ? 'e.g. Rental income' : 'e.g. Gym'}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Color</label>
            <div className="swatch-row">
              {CATEGORY_PALETTE.map((c) => (
                <button
                  key={c}
                  className={`swatch ${color === c ? 'active' : ''}`}
                  style={{ background: c }}
                  aria-label={`Use color ${c}`}
                  onClick={() => setColor(c)}
                >
                  {color === c && <Check size={14} strokeWidth={3} color="#0c0c0c" />}
                </button>
              ))}
            </div>
          </div>
          {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}
          <button className="btn btn-primary btn-block" disabled={saving || !label.trim()} onClick={handleSubmit}>
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Add category'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryGroup({ type, categories }) {
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const rows = categoriesOfType(categories, type);

  async function handleSave(form) {
    if (editing) await api.updateCategory(editing.id, form);
    else await api.addCategory(form);
    await refreshCategories();
    setEditing(null);
    setAdding(false);
  }

  async function handleDelete(cat) {
    if (!window.confirm(`Delete "${cat.label}"?`)) return;
    try {
      await api.deleteCategory(cat.id);
    } catch (err) {
      // In use, or protected by an integration — the server tells us which.
      if (err.status === 409) {
        const proceed = window.confirm(
          `${err.message}.\n\nDelete it anyway? Those transactions keep their amounts and stay in your history.`
        );
        if (!proceed) return;
        try {
          await api.deleteCategory(cat.id, { force: true });
        } catch (forceErr) {
          window.alert(forceErr.message || 'Could not delete this category.');
          return;
        }
      } else {
        window.alert(err.message || 'Could not delete this category.');
        return;
      }
    }
    await refreshCategories();
  }

  return (
    <div className="glass-card">
      {rows.length === 0 && (
        <div className="empty-state" style={{ padding: '12px 0' }}>No {type} categories yet.</div>
      )}
      {rows.map((cat) => (
        <div className="entry-row" key={cat.id}>
          <span className="cat-dot" style={{ background: cat.color }} />
          <div className="entry-info">
            <div className="entry-name">{cat.label}</div>
            {Boolean(cat.is_system) && <div className="entry-meta">Used by the Massiv sync</div>}
          </div>
          <div className="entry-actions">
            <button className="icon-btn" onClick={() => setEditing(cat)} aria-label={`Edit ${cat.label}`}>
              <Pencil size={16} />
            </button>
            <button
              className="icon-btn danger"
              disabled={Boolean(cat.is_system)}
              style={cat.is_system ? { opacity: 0.3 } : undefined}
              onClick={() => handleDelete(cat)}
              aria-label={`Delete ${cat.label}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
      <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => setAdding(true)}>
        <Plus size={16} /> Add {type} category
      </button>

      {(adding || editing) && (
        <CategoryForm
          initial={editing}
          type={editing ? editing.type : type}
          onCancel={() => { setAdding(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function CategoriesSection() {
  const categories = useCategories();

  if (categories === null) {
    return (
      <div className="glass-card">
        <div className="spinner" style={{ margin: '12px auto' }} />
      </div>
    );
  }

  return (
    <>
      <CategoryGroup type="expense" categories={categories} />
      <div className="list-section-title">Income categories</div>
      <CategoryGroup type="income" categories={categories} />
    </>
  );
}

function PassphraseSection({ onLoggedOut }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleChange() {
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      const { token } = await api.changePassphrase(current, next);
      setToken(token);
      setCurrent('');
      setNext('');
      setSuccess(true);
    } catch (err) {
      setError(err.message === 'unauthorized' ? 'Session expired — log in again.' : 'Could not change passphrase.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-card">
      <div className="field">
        <label>Current passphrase</label>
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div className="field">
        <label>New passphrase</label>
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
      </div>
      {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}
      {success && <div style={{ color: 'var(--accent)', fontSize: 13, marginBottom: 10 }}>Passphrase updated.</div>}
      <button className="btn btn-ghost btn-block" disabled={saving || !current || !next} onClick={handleChange}>
        {saving ? 'Updating…' : 'Change passphrase'}
      </button>
      <button className="btn btn-danger btn-block" style={{ marginTop: 10 }} onClick={onLoggedOut}>
        <LogOut size={16} /> Log out
      </button>
    </div>
  );
}

export default function Settings({ onLoggedOut }) {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
        </div>
      </div>

      <div className="list-section-title">Monthly targets</div>
      <TargetsSection />

      <div className="list-section-title">Expense categories</div>
      <CategoriesSection />

      <div className="list-section-title">Account</div>
      <PassphraseSection onLoggedOut={onLoggedOut} />

      <div className="footer-note">a year28 development</div>
    </div>
  );
}
