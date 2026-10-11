import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../api';
import ConfirmDialog from '../ConfirmDialog';

let tempKey = 0;
const toRow = p => ({ key: `p${p.id}`, id: p.id, name: p.name, saved: p.name, entry_count: p.entry_count, deleted_count: p.deleted_count });

// One editable line per project; saves on blur. New lines are created on the
// server once they get a name.
export default function ProjectsSection({ onProjectsChanged }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [confirmRow, setConfirmRow] = useState(null);
  const [focusKey, setFocusKey] = useState(null);
  const inputs = useRef({});

  useEffect(() => {
    api('/admin/projects').then(list => setRows(list.map(toRow))).catch(e => setError(e.message));
  }, []);

  useEffect(() => {
    if (focusKey) inputs.current[focusKey]?.focus();
  }, [focusKey]);

  const update = (key, patch) => setRows(list => list.map(r => (r.key === key ? { ...r, ...patch } : r)));

  const save = async row => {
    const name = row.name.trim();
    if (name === row.saved) return update(row.key, { name });
    if (!name) {
      // Clearing an existing name isn't allowed - restore it.
      if (row.id) update(row.key, { name: row.saved });
      return;
    }
    setError('');
    try {
      const saved = await api(row.id ? `/admin/projects/${row.id}` : '/admin/projects', {
        method: row.id ? 'PUT' : 'POST',
        body: JSON.stringify({ name })
      });
      update(row.key, { id: saved.id, name: saved.name, saved: saved.name, entry_count: saved.entry_count, deleted_count: saved.deleted_count });
      onProjectsChanged();
    } catch (e) {
      setError(e.message);
      update(row.key, { name: row.saved });
    }
  };

  const addRow = () => {
    // Reuse an empty unsaved line instead of piling up blank ones.
    const blank = rows.find(r => !r.id && !r.name.trim());
    if (blank) return inputs.current[blank.key]?.focus();
    const key = `new${++tempKey}`;
    setRows(list => [...list, { key, id: null, name: '', saved: '', entry_count: 0 }]);
    setFocusKey(key);
  };

  const remove = async row => {
    setConfirmRow(null);
    if (!row.id) return setRows(list => list.filter(r => r.key !== row.key));
    setError('');
    try {
      await api(`/admin/projects/${row.id}`, { method: 'DELETE' });
      setRows(list => list.filter(r => r.key !== row.key));
      onProjectsChanged();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <h2>Projekte</h2>
      <p className="muted">Projekte mit Einträgen können nicht gelöscht werden – auch gelöschte Einträge zählen, bis ein Admin sie endgültig entfernt.</p>
      {error && <p className="error">{error}</p>}

      <div className="project-rows">
        {rows.map(row => (
          <div key={row.key} className="project-row">
            <input
              ref={el => { inputs.current[row.key] = el; }}
              placeholder="Projektname"
              value={row.name}
              onChange={e => update(row.key, { name: e.target.value })}
              onBlur={() => save(row)}
              onKeyDown={e => {
                // Enter saves (via blur) and continues in a fresh line.
                if (e.key !== 'Enter' || !row.name.trim()) return;
                e.currentTarget.blur();
                addRow();
              }}
            />
            <button
              type="button"
              className="icon danger"
              onMouseDown={e => e.preventDefault()}
              disabled={row.entry_count > 0}
              title={row.entry_count > 0
                ? `Enthält ${row.entry_count} Einträge${row.deleted_count ? ` (davon ${row.deleted_count} gelöscht – erst endgültig entfernen)` : ''} – Löschen nicht möglich`
                : 'Projekt löschen'}
              onClick={() => (row.id ? setConfirmRow(row) : remove(row))}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="primary round" title="Weiteres Projekt" onClick={addRow} style={{ marginTop: '0.8rem' }}>
        <Plus size={22} />
      </button>

      {confirmRow && (
        <ConfirmDialog
          message={`Projekt „${confirmRow.saved}“ wirklich löschen?`}
          onConfirm={() => remove(confirmRow)}
          onCancel={() => setConfirmRow(null)}
        />
      )}
    </>
  );
}
