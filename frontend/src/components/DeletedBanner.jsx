import React, { useState } from 'react';
import { ArchiveRestore, Trash2 } from 'lucide-react';
import { api } from '../api';
import ConfirmDialog from './ConfirmDialog';

const fmtDeletedAt = sqlUtc => new Date(`${sqlUtc.replace(' ', 'T')}Z`).toLocaleString('de-DE', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

// Shown on deleted entries (only admins get to see those): who deleted it
// when, plus restore / final removal.
export default function DeletedBanner({ entry, onRestored, onPurged, onError }) {
  const [confirmPurge, setConfirmPurge] = useState(false);

  const restore = async () => {
    try {
      onRestored(await api(`/entries/${entry.id}/restore`, { method: 'POST' }));
    } catch (e) {
      onError?.(e.message);
    }
  };

  const purge = async () => {
    setConfirmPurge(false);
    try {
      await api(`/entries/${entry.id}/purge`, { method: 'DELETE' });
      onPurged(entry.id);
    } catch (e) {
      onError?.(e.message);
    }
  };

  return (
    <div className="deleted-banner">
      <span>
        Gelöscht{entry.deleted_by_name && <> von <b>{entry.deleted_by_name}</b></>} am {fmtDeletedAt(entry.deleted_at)}
      </span>
      {entry.permissions?.canRestore && (
        <span className="deleted-actions">
          <button type="button" className="secondary small" onClick={restore}>
            <ArchiveRestore size={15} /> Wiederherstellen
          </button>
          <button type="button" className="secondary small danger-text" onClick={() => setConfirmPurge(true)}>
            <Trash2 size={15} /> Endgültig löschen
          </button>
        </span>
      )}
      {confirmPurge && (
        <ConfirmDialog
          message={`„${entry.title || 'Ohne Titel'}“ endgültig löschen? Das lässt sich nicht rückgängig machen – auch Bewertungen und Reaktionen gehen verloren.`}
          confirmLabel="Endgültig löschen"
          onConfirm={purge}
          onCancel={() => setConfirmPurge(false)}
        />
      )}
    </div>
  );
}
