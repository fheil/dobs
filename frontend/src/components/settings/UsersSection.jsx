import React, { useEffect, useState } from 'react';
import { api } from '../../api';

// Admin view of all users: login name, editable display name, admin switch.
export default function UsersSection({ user, onUserChange }) {
  const [users, setUsers] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin/users').then(setUsers).catch(e => setError(e.message));
  }, []);

  const toggleAdmin = async u => {
    setError('');
    try {
      await api(`/admin/users/${u.id}/admin`, { method: 'PUT', body: JSON.stringify({ admin: !u.admin }) });
      setUsers(list => list.map(x => (x.id === u.id ? { ...x, admin: !u.admin } : x)));
    } catch (e) {
      setError(e.message);
    }
  };

  const saveDisplayName = async u => {
    const value = (drafts[u.id] ?? u.display_name ?? '').trim();
    setDrafts(d => { const { [u.id]: _, ...rest } = d; return rest; });
    if (value === (u.display_name ?? '')) return;
    setError('');
    try {
      const saved = await api(`/admin/users/${u.id}/display-name`, { method: 'PUT', body: JSON.stringify({ displayName: value }) });
      setUsers(list => list.map(x => (x.id === u.id ? { ...x, display_name: saved.display_name } : x)));
      if (u.id === user.id) onUserChange({ ...user, displayName: saved.display_name });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <h2>Benutzer</h2>
      <p className="muted">Anzeigenamen sehen alle anderen; der Anmeldename bleibt fürs Einloggen. Ohne Anzeigename wird der Anmeldename angezeigt.</p>
      {error && <p className="error">{error}</p>}
      <div className="matrix-wrapper">
        <table className="matrix users-table">
          <thead>
            <tr>
              <th>Anmeldename</th>
              <th>Anzeigename</th>
              <th>Admin</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td className="matrix-user">
                  {u.username}
                  {u.id === user.id && <span className="muted"> (du)</span>}
                </td>
                <td>
                  <input
                    className="inline-input"
                    placeholder={u.username}
                    maxLength={50}
                    value={drafts[u.id] ?? u.display_name ?? ''}
                    onChange={e => setDrafts(d => ({ ...d, [u.id]: e.target.value }))}
                    onBlur={() => saveDisplayName(u)}
                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                  />
                </td>
                <td>
                  <label className="switch" title={u.id === user.id ? 'Den eigenen Admin-Status kannst du nicht ändern' : ''}>
                    <input type="checkbox" checked={u.admin} disabled={u.id === user.id} onChange={() => toggleAdmin(u)} />
                    <span className="slider" />
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
