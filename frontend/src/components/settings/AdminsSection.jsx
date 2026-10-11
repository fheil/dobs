import React, { useEffect, useState } from 'react';
import { api } from '../../api';

export default function AdminsSection({ user }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin/users').then(setUsers).catch(e => setError(e.message));
  }, []);

  const toggle = async u => {
    setError('');
    try {
      await api(`/admin/users/${u.id}/admin`, { method: 'PUT', body: JSON.stringify({ admin: !u.admin }) });
      setUsers(list => list.map(x => (x.id === u.id ? { ...x, admin: !u.admin } : x)));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <h2>Admin-Rechte</h2>
      <p className="muted">Admins verwalten Projekte, Projektzuordnungen und Admin-Rechte.</p>
      {error && <p className="error">{error}</p>}
      <div className="row-list">
        {users.map(u => (
          <div key={u.id} className="row-item">
            <span>
              {u.username}
              {u.id === user.id && <span className="muted"> (du)</span>}
            </span>
            <label className="switch" title={u.id === user.id ? 'Den eigenen Admin-Status kannst du nicht ändern' : ''}>
              <input type="checkbox" checked={u.admin} disabled={u.id === user.id} onChange={() => toggle(u)} />
              <span className="slider" />
            </label>
          </div>
        ))}
      </div>
    </>
  );
}
