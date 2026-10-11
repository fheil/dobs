import React, { useEffect, useState } from 'react';
import { Minus, NotebookPen, Plus } from 'lucide-react';
import { api } from '../api';
import { addDays, fmtLong, today } from '../dates';
import PeriodNav from './PeriodNav';
import EntryTile from './EntryTile';
import ConfirmDialog from './ConfirmDialog';

export default function JournalTab({ project, user, date, onDateChange, onError }) {
  const canWrite = project.role === 'write';
  const [entries, setEntries] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [newId, setNewId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSelectedId(null);
    api(`/entries?project_id=${project.id}&from=${date}&to=${date}`)
      .then(list => { if (!cancelled) setEntries(list); })
      .catch(e => onError(e.message));
    return () => { cancelled = true; };
  }, [date]);

  const add = async () => {
    try {
      const entry = await api('/entries', { method: 'POST', body: JSON.stringify({ project_id: project.id, entry_date: date }) });
      setEntries(list => [...list, entry]);
      setSelectedId(entry.id);
      setNewId(entry.id);
    } catch (e) {
      onError(e.message);
    }
  };

  const save = async (id, patch) => {
    try {
      const updated = await api(`/entries/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
      // An entry moved to another day leaves this page.
      setEntries(list => updated.entry_date === date
        ? list.map(e => (e.id === id ? updated : e))
        : list.filter(e => e.id !== id));
    } catch (e) {
      onError(e.message);
    }
  };

  const remove = async () => {
    try {
      await api(`/entries/${selectedId}`, { method: 'DELETE' });
      setEntries(list => list.filter(e => e.id !== selectedId));
      setSelectedId(null);
    } catch (e) {
      onError(e.message);
    } finally {
      setConfirmDelete(false);
    }
  };

  const selected = entries.find(e => e.id === selectedId);
  const canDelete = canWrite && selected?.user_id === user.id;
  const hasOtherAuthors = entries.some(e => e.user_id !== user.id);

  return (
    <div className="tab-content">
      <div className="section-title">
        <h2>{fmtLong(date)}</h2>
        <PeriodNav
          prevTitle="Vorheriger Tag"
          nextTitle="Nächster Tag"
          onPrev={() => onDateChange(addDays(date, -1))}
          onNext={() => onDateChange(addDays(date, 1))}
          onToday={() => onDateChange(today())}
          isToday={date === today()}
        />
      </div>

      {entries.length === 0 ? (
        <div className="empty">
          <NotebookPen size={48} />
          <h3>Keine Einträge an diesem Tag</h3>
          {canWrite && <p>Mit <b>+</b> legst du einen neuen Eintrag an.</p>}
        </div>
      ) : (
        <div className="tiles">
          {entries.map(entry => (
            <EntryTile
              key={entry.id}
              entry={entry}
              readOnly={!canWrite || entry.user_id !== user.id}
              showAuthor={hasOtherAuthors}
              selected={entry.id === selectedId}
              autoFocus={entry.id === newId}
              onSelect={setSelectedId}
              onSave={save}
            />
          ))}
        </div>
      )}

      {canWrite && <div className="tile-actions">
        <button type="button" className="primary round" title="Neuer Eintrag" onClick={add}>
          <Plus size={22} />
        </button>
        <button
          type="button"
          className="primary round danger"
          title={canDelete ? 'Ausgewählten Eintrag löschen' : 'Zum Löschen erst eine eigene Kachel anklicken'}
          disabled={!canDelete}
          onMouseDown={e => e.preventDefault()}
          onClick={() => setConfirmDelete(true)}
        >
          <Minus size={22} />
        </button>
      </div>}

      {confirmDelete && canDelete && (
        <ConfirmDialog
          message={`Eintrag „${selected.title || 'ohne Titel'}“ wirklich löschen?`}
          onConfirm={remove}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
