import db from './db.js';

// Admin switches for deleting/locking entries (app_settings row).
export const SETTING_KEYS = [
  'delete_allowed',          // Einträge dürfen überhaupt gelöscht werden
  'delete_done_allowed',     // ... auch erledigte
  'delete_reacted_allowed',  // ... auch mit Reaktionen anderer
  'lock_reacted',            // Reaktionen anderer sperren Titel/Inhalt/Datum (nur "Erledigt" bleibt)
  'admins_see_deleted',      // Admins sehen gelöschte Einträge in Journal, Report und Hindernisse
  'registration_enabled'     // Neue Benutzer können sich selbst registrieren
];

export function getSettings() {
  const row = db.prepare(`SELECT ${SETTING_KEYS.join(', ')} FROM app_settings WHERE id = 1`).get();
  return Object.fromEntries(SETTING_KEYS.map(k => [k, !!row[k]]));
}

export function updateSettings(patch) {
  const keys = SETTING_KEYS.filter(k => k in patch);
  if (keys.length) {
    db.prepare(`UPDATE app_settings SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = 1`)
      .run(...keys.map(k => (patch[k] ? 1 : 0)));
  }
  return getSettings();
}
