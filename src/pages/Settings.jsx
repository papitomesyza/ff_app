import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { api, setToken } from '../api.js';

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

      <div className="list-section-title">Account</div>
      <PassphraseSection onLoggedOut={onLoggedOut} />

      <div className="footer-note">a year28 development</div>
    </div>
  );
}
