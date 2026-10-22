import React, { useEffect, useRef, useState } from 'react';
import { Lock, Trash2 } from 'lucide-react';
import ReactionBar from './ReactionBar';
import { today } from '../dates';
import DeletedBanner from './DeletedBanner';

const EDITABLE = ['title', 'content', 'obstacles', 'entry_date', 'entry_time', 'done'];

// One journal entry as an inline-editable tile. Text fields save on blur,
// date/time/checkbox save on change. What is editable comes from the
// server-computed entry.permissions.
export default function EntryTile({ entry, showAuthor, showDelete, autoFocus, onSave, onDelete, onReactions, onRestored, onPurged, onError }) {
  const [draft, setDraft] = useState(entry);
  const deleted = !!entry.deleted_at;
  const { canEdit, contentLocked } = entry.permissions;
  // readOnly: nothing editable; fieldsLocked: everything except "Erledigt".
  const readOnly = !canEdit;
  const fieldsLocked = readOnly || contentLocked;
  const titleRef = useRef(null);

  useEffect(() => {
    if (autoFocus) titleRef.current?.focus();
  }, [autoFocus]);

  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  const commit = patch => {
    const changed = Object.fromEntries(
      Object.entries(patch).filter(([k, v]) => EDITABLE.includes(k) && v !== entry[k])
    );
    if (Object.keys(changed).length) onSave(entry.id, changed);
  };

  const commitField = k => () => commit({ [k]: draft[k] });

  const setAndCommit = (k, v) => {
    set(k, v);
    commit({ [k]: v });
  };

  return (
    <div
      className={`tile${draft.done ? ' done' : ''}${fieldsLocked ? ' readonly' : ''}${deleted ? ' deleted' : ''}`}
    >
      {deleted && <DeletedBanner entry={entry} onRestored={onRestored} onPurged={onPurged} onError={onError} />}
      <div className="tile-head">
        <input
          ref={titleRef}
          className="tile-title"
          placeholder="Titel"
          maxLength={200}
          value={draft.title}
          onChange={e => set('title', e.target.value)}
          onBlur={commitField('title')}
          readOnly={fieldsLocked}
        />
        {showAuthor && <span className="author">{entry.author_name}</span>}
        <label className="check">
          <input
            type="checkbox"
            checked={draft.done}
            disabled={readOnly}
            onChange={e => setAndCommit('done', e.target.checked)}
          />
          Erledigt
        </label>
      </div>

      <div className="tile-meta">
        <label>
          Datum
          <input
            type="date"
            required
            readOnly={fieldsLocked}
            max={today()}
            value={draft.entry_date}
            onChange={e => {
              const value = e.target.value;
              // Typed-in future dates are ignored (max only limits the picker).
              if (value && value > today()) return set('entry_date', entry.entry_date);
              set('entry_date', value);
              if (value) commit({ entry_date: value });
            }}
          />
        </label>
        <label>
          Uhrzeit
          <input
            type="time"
            readOnly={fieldsLocked}
            value={draft.entry_time}
            onChange={e => set('entry_time', e.target.value)}
            onBlur={commitField('entry_time')}
          />
        </label>
      </div>

      <label>
        Inhalt
        <textarea
          rows={3}
          placeholder="Was wurde erledigt?"
          maxLength={20000}
          readOnly={fieldsLocked}
          value={draft.content}
          onChange={e => set('content', e.target.value)}
          onBlur={commitField('content')}
        />
      </label>

      <label>
        Hindernisse
        <textarea
          rows={2}
          placeholder="Was stand im Weg?"
          maxLength={10000}
          readOnly={fieldsLocked}
          value={draft.obstacles}
          onChange={e => set('obstacles', e.target.value)}
          onBlur={commitField('obstacles')}
        />
      </label>
      {contentLocked && (
        <p className="lock-hint">
          <Lock size={14} /> Andere haben reagiert – nur „Erledigt“ lässt sich noch ändern.
        </p>
      )}
      {!deleted && (
        <ReactionBar entry={{ ...entry, obstacles: draft.obstacles }} onChange={onReactions} onError={onError}>
          {showDelete && (
            <button
              type="button"
              className="icon danger"
              title={entry.permissions.deleteBlocked || 'Eintrag löschen'}
              aria-label="Eintrag löschen"
              disabled={!entry.permissions.canDelete}
              onClick={() => onDelete(entry)}
            >
              <Trash2 size={18} />
            </button>
          )}
        </ReactionBar>
      )}
    </div>
  );
}
