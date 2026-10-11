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

  const load = () => api(`/entries?project_id=${project.id}&from=${date}&to=${date}`);

  useEffect(() => {
    let cancelled = false;
    setSelectedId(null);
    load()
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

  const setReactions = (id, reactions) => setEntries(list => list.map(e => (e.id === id ? { ...e, reactions } : e)));
  const replace = updated => setEntries(list => list.map(e => (e.id === updated.id ? updated : e)));
  const drop = id => setEntries(list => list.filter(e => e.id !== id));

  const remove = async () => {
    setConfirmDelete(false);
    try {
      await api(`/entries/${selectedId}`, { method: 'DELETE' });
      setSelectedId(null);
      // Reload: admins may keep seeing the entry (as deleted), others don't.
      setEntries(await load());
    } catch (e) {
      onError(e.message);
    }
  };

  const selected = entries.find(e => e.id === selectedId);
  const canDelete = !!selected?.permissions.canDelete;
  const deleteTitle = !selected
    ? 'Zum Löschen erst eine Kachel anklicken'
    : selected.permissions.deleteBlocked || 'Ausgewählten Eintrag löschen';
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
              key={`${entry.id}:${entry.deleted_at || ''}`}
              entry={entry}
              showAuthor={hasOtherAuthors}
              selected={entry.id === selectedId}
              autoFocus={entry.id === newId}
              onSelect={setSelectedId}
              onSave={save}
              onReactions={setReactions}
              onRestored={replace}
              onPurged={drop}
              onError={onError}
            />
          ))}
        </div>
      )}

      {(canWrite || user.admin) && <div className="tile-actions">
        {canWrite && (
          <button type="button" className="primary round" title="Neuer Eintrag" onClick={add}>
            <Plus size={22} />
          </button>
        )}
        <button
          type="button"
          className="primary round danger"
          title={deleteTitle}
          disabled={!canDelete}
          onMouseDown={e => e.preventDefault()}
          onClick={() => setConfirmDelete(true)}
        >
          <Minus size={22} />
        </button>
      </div>}

      {confirmDelete && canDelete && (
        <ConfirmDialog
          message={selected.user_id === user.id
            ? `Eintrag „${selected.title || 'ohne Titel'}“ löschen? Ein Admin kann ihn wiederherstellen.`
            : `Eintrag „${selected.title || 'ohne Titel'}“ von ${selected.username} als Admin löschen? Er lässt sich wiederherstellen.`}
          onConfirm={remove}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
