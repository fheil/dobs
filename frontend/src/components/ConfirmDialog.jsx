import React from 'react';

export default function ConfirmDialog({ message, confirmLabel = 'Löschen', danger = true, onConfirm, onCancel }) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="modal" style={{ width: 'min(420px, 100%)', padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
        <p style={{ margin: 0 }}>{message}</p>
        <div className="actions">
          <button type="button" className="secondary" onClick={onCancel}>Abbrechen</button>
          <button type="button" className={danger ? 'primary danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
