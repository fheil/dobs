import React, { useState } from 'react';
import { api } from '../../api';

const EMPTY = { currentPassword: '', newPassword: '', repeat: '' };

export default function PasswordSection() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (form.newPassword !== form.repeat) return setError('Die neuen Passwörter stimmen nicht überein.');
    try {
      await api('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      });
      setForm(EMPTY);
      setSuccess('Passwort wurde geändert.');
    } catch (x) {
      setError(x.message);
    }
  };

  return (
    <>
      <h2>Passwort ändern</h2>
      <form onSubmit={submit} className="narrow">
        <label>
          Aktuelles Passwort
          <input type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} required />
        </label>
        <label>
          Neues Passwort (mind. 8 Zeichen)
          <input type="password" autoComplete="new-password" minLength={8} value={form.newPassword} onChange={set('newPassword')} required />
        </label>
        <label>
          Neues Passwort wiederholen
          <input type="password" autoComplete="new-password" minLength={8} value={form.repeat} onChange={set('repeat')} required />
        </label>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
        <button type="submit" className="primary" style={{ marginTop: '1rem' }}>Passwort ändern</button>
      </form>
    </>
  );
}
