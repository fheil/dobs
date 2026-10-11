import React, { useEffect, useState } from 'react';
import { api } from '../../api';

export default function RegistrationSection() {
  const [enabled, setEnabled] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin/settings').then(s => setEnabled(s.registration_enabled)).catch(e => setError(e.message));
  }, []);

  const toggle = async () => {
    const previous = enabled;
    setError('');
    setEnabled(!previous);
    try {
      const s = await api('/admin/settings', { method: 'PUT', body: JSON.stringify({ registration_enabled: !previous }) });
      setEnabled(s.registration_enabled);
    } catch (e) {
      setEnabled(previous);
      setError(e.message);
    }
  };

  return (
    <>
      <h2>Registrierung</h2>
      <p className="muted">Ob sich neue Benutzer auf der Login-Seite selbst ein Konto anlegen können.</p>
      {error && <p className="error">{error}</p>}
      {enabled !== null && (
        <div className="row-list">
          <div className="row-item switch-row">
            <span>
              <b>Registrierung erlauben</b>
              <small>{enabled ? 'Neue Benutzer können sich registrieren.' : 'Nur bestehende Benutzer können sich anmelden.'}</small>
            </span>
            <label className="switch">
              <input type="checkbox" checked={enabled} onChange={toggle} />
              <span className="slider" />
            </label>
          </div>
        </div>
      )}
    </>
  );
}
