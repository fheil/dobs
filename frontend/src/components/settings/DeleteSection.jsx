import React, { useEffect, useState } from 'react';
import { api } from '../../api';

const SWITCHES = [
  { key: 'delete_allowed', label: 'Einträge löschen erlaubt', hint: 'Hauptschalter. Aus: Niemand außer Admins kann Einträge löschen.' },
  { key: 'delete_done_allowed', label: 'Erledigte Einträge löschbar', hint: 'Aus: Erst „Erledigt“ herausnehmen, dann löschen.', needsDelete: true },
  { key: 'delete_reacted_allowed', label: 'Einträge mit Reaktionen anderer löschbar', hint: 'Aus: Gesperrt, solange andere Sterne, 😱 oder 🙋 vergeben haben.', needsDelete: true },
  { key: 'lock_reacted', label: 'Einträge mit Reaktionen anderer schreibgeschützt', hint: 'An: Titel, Inhalt, Hindernisse, Datum und Uhrzeit sind dann gesperrt – nur „Erledigt“ bleibt änderbar.' },
  { key: 'admins_see_deleted', label: 'Admins sehen gelöschte Einträge', hint: 'In Journal, Report und Hindernisse, mit „Wiederherstellen“ und „Endgültig löschen“.' }
];

export default function DeleteSection() {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin/settings').then(setSettings).catch(e => setError(e.message));
  }, []);

  const toggle = async key => {
    const previous = settings;
    setError('');
    setSettings(s => ({ ...s, [key]: !s[key] }));
    try {
      setSettings(await api('/admin/settings', { method: 'PUT', body: JSON.stringify({ [key]: !previous[key] }) }));
    } catch (e) {
      setSettings(previous);
      setError(e.message);
    }
  };

  return (
    <>
      <h2>Löschen &amp; Sperren</h2>
      <p className="muted">
        Gilt für alle Projekte. Gelöschte Einträge werden nur ausgeblendet; Admins können sie wiederherstellen.
        Admins dürfen Einträge immer löschen, auch fremde.
      </p>
      {error && <p className="error">{error}</p>}
      {settings && (
        <div className="row-list">
          {SWITCHES.map(s => {
            const inactive = s.needsDelete && !settings.delete_allowed;
            return (
              <div key={s.key} className={`row-item switch-row${inactive ? ' inactive' : ''}`}>
                <span>
                  <b>{s.label}</b>
                  <small>{inactive ? 'Ohne Wirkung, solange Löschen nicht erlaubt ist.' : s.hint}</small>
                </span>
                <label className="switch">
                  <input type="checkbox" checked={settings[s.key]} disabled={inactive} onChange={() => toggle(s.key)} />
                  <span className="slider" />
                </label>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
