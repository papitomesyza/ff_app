import { useEffect, useState, useCallback } from 'react';
import { getToken, setToken, api } from './api.js';
import Login from './components/Login.jsx';
import BottomNav from './components/BottomNav.jsx';
import AddSheet from './components/AddSheet.jsx';
import Overview from './pages/Overview.jsx';
import History from './pages/History.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [page, setPage] = useState('overview');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    function handleUnauthorized() {
      setAuthed(false);
    }
    window.addEventListener('ffapp:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('ffapp:unauthorized', handleUnauthorized);
  }, []);

  const handleNavSelect = useCallback((id) => {
    if (id === 'add') {
      setShowAddSheet(true);
    } else {
      setPage(id);
    }
  }, []);

  async function handleLogged(tx) {
    await api.createTransaction(tx);
    setRefreshKey((k) => k + 1);
  }

  function handleLoggedOut() {
    setToken(null);
    setAuthed(false);
  }

  if (!authed) {
    return <Login onLoggedIn={() => setAuthed(true)} />;
  }

  return (
    <div className="app-shell">
      {page === 'overview' && <Overview key={refreshKey} />}
      {page === 'history' && <History key={refreshKey} />}
      {page === 'settings' && <Settings onLoggedOut={handleLoggedOut} />}

      <BottomNav active={showAddSheet ? 'add' : page} onSelect={handleNavSelect} />

      {showAddSheet && (
        <AddSheet
          onClose={() => setShowAddSheet(false)}
          onLogged={async (tx) => {
            await handleLogged(tx);
          }}
        />
      )}
    </div>
  );
}
