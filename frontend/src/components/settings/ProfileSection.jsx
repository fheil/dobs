import React, { useState } from 'react';
import { api } from '../../api';
import PasswordSection from './PasswordSection';

export default function ProfileSection({ user, onUserChange }) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const { user: updated } = await api('/auth/profile', { method: 'PUT', body: JSON.stringify({ displayName }) });
      setDisplayName(updated.displayName || '');
      onUserChange(updated);
      setSuccess(updated.displayName ? 'Anzeigename gespeichert.' : 'Anzeigename entfernt – es wird dein Anmeldename angezeigt.');
    } catch (x) {
      setError(x.message);
    }
  };

  return (
    <>
      <h2>Profil</h2>
      <p className="muted">Angemeldet als <b>{user.username}</b>. Andere sehen deinen Anzeigenamen.</p>
      <form onSubmit={submit} className="narrow">
        <label>
          Anzeigename
          <input
            maxLength={50}
            placeholder={user.username}
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
          />
        </label>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
        <button type="submit" className="primary" style={{ marginTop: '1rem' }}>Speichern</button>
      </form>

      <div className="section-gap" />
      <PasswordSection />
    </>
  );
}
