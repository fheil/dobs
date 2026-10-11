import React, { useEffect, useRef, useState } from 'react';

const EDITABLE = ['title', 'content', 'obstacles', 'entry_date', 'entry_time', 'done'];

// One journal entry as an inline-editable tile. Text fields save on blur,
// date/time/checkbox save on change. Read-only for other users' entries and
// for read-only project members.
export default function EntryTile({ entry, readOnly, showAuthor, selected, autoFocus, onSelect, onSave }) {
  const [draft, setDraft] = useState(entry);
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
      className={`tile${selected ? ' selected' : ''}${draft.done ? ' done' : ''}${readOnly ? ' readonly' : ''}`}
      onMouseDown={() => onSelect(entry.id)}
      onFocusCapture={() => onSelect(entry.id)}
    >
      <div className="tile-head">
        <input
          ref={titleRef}
          className="tile-title"
          placeholder="Titel"
          value={draft.title}
          onChange={e => set('title', e.target.value)}
          onBlur={commitField('title')}
          readOnly={readOnly}
        />
        {showAuthor && <span className="author">{entry.username}</span>}
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
            readOnly={readOnly}
            value={draft.entry_date}
            onChange={e => {
              set('entry_date', e.target.value);
              if (e.target.value) commit({ entry_date: e.target.value });
            }}
          />
        </label>
        <label>
          Uhrzeit
          <input
            type="time"
            readOnly={readOnly}
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
          readOnly={readOnly}
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
          readOnly={readOnly}
          value={draft.obstacles}
          onChange={e => set('obstacles', e.target.value)}
          onBlur={commitField('obstacles')}
        />
      </label>
    </div>
  );
}
