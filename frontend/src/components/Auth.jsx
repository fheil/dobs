import React, { useEffect, useState } from 'react';
import { CheckSquare } from 'lucide-react';
import { api, setSession, ServerUnreachableError, SERVER_UNREACHABLE } from '../api';

export default function Auth({ onLogin, error: externalError }) {
  const [register, setRegister] = useState(false);
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [regEnabled, setRegEnabled] = useState(false);
  const [serverDown, setServerDown] = useState(false);

  // Asks whether sign-up is open; while the backend doesn't answer, shows a
  // notice and retries every 10 s, so the page recovers on its own.
  useEffect(() => {
    let timer;
    const check = () => api('/auth/registration-status')
      .then(d => { setServerDown(false); setRegEnabled(d.enabled); })
      .catch(e => {
        setRegEnabled(false);
        if (e instanceof ServerUnreachableError) {
          setServerDown(true);
          timer = setTimeout(check, 10000);
        }
      });
    check();
    return () => clearTimeout(timer);
  }, []);

  const submit = async e => {
    e.preventDefault();
    setError('');
    try {
      const d = await api(`/auth/${register ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setSession(d.token);
      onLogin(d.user);
    } catch (x) {
      setError(x.message);
    }
  };

  const shownError = error || externalError || (serverDown ? SERVER_UNREACHABLE : '');

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="brand-mark">
          <CheckSquare size={32} />
        </div>
        <h1>dobs</h1>
        <p className="muted">done tasks &amp; obstacles</p>

        <form onSubmit={submit} style={{ marginTop: '2rem' }}>
          <label>
            Benutzername
            <input
              type="text"
              autoComplete="username"
              maxLength={50}
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
            />
          </label>
          <label>
            Passwort
            <input
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>
          {shownError && <p className="form-error">❌ {shownError}</p>}
          <button type="submit" className="primary wide">
            {register ? 'Registrieren' : 'Anmelden'}
          </button>
        </form>

        {regEnabled && (
          <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
            {register ? 'Bereits registriert?' : 'Noch kein Konto?'}{' '}
            <button type="button" className="link" onClick={() => setRegister(!register)}>
              {register ? 'Anmelden' : 'Registrieren'}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
