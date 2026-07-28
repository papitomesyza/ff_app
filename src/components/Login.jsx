import { useState } from 'react';
import { api, setToken } from '../api.js';

export default function Login({ onLoggedIn }) {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await api.login(passphrase);
      setToken(token);
      onLoggedIn();
    } catch (err) {
      setError('Wrong passphrase. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-logo">
        Financial <span>Flow</span>
      </div>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 320 }}>
        <div className="field">
          <label htmlFor="passphrase">Passphrase</label>
          <input
            id="passphrase"
            type="password"
            autoFocus
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Enter your passphrase"
          />
        </div>
        {error && <div className="error-text" style={{ marginBottom: 12 }}>{error}</div>}
        <button type="submit" className="btn btn-primary btn-block" disabled={loading || !passphrase}>
          {loading ? 'Checking…' : 'Unlock'}
        </button>
      </form>
      <div className="footer-note">a year28 development</div>
    </div>
  );
}
