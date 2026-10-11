import React, { useEffect, useState } from 'react';
import { ArrowDownUp, PartyPopper } from 'lucide-react';
import { api } from '../api';
import { daysBetween, fmtDate, today } from '../dates';

const openSince = iso => {
  const n = daysBetween(iso, today());
  if (n < 0) return 'liegt in der Zukunft';
  if (n === 0) return 'seit heute offen';
  if (n === 1) return 'seit 1 Tag offen';
  return `seit ${n} Tagen offen`;
};

export default function ObstaclesTab({ project, user, onOpenDay, onError }) {
  const [order, setOrder] = useState('asc');
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api(`/entries/obstacles?project_id=${project.id}&order=${order}`)
      .then(list => { if (!cancelled) setEntries(list); })
      .catch(e => onError(e.message));
    return () => { cancelled = true; };
  }, [order]);

  const markDone = async id => {
    try {
      await api(`/entries/${id}`, { method: 'PUT', body: JSON.stringify({ done: true }) });
      setEntries(list => list.filter(e => e.id !== id));
    } catch (e) {
      onError(e.message);
    }
  };

  return (
    <div className="tab-content">
      <div className="section-title">
        <h2>Offene Hindernisse <span>({entries.length})</span></h2>
        <button
          type="button"
          className="secondary small"
          onClick={() => setOrder(o => (o === 'asc' ? 'desc' : 'asc'))}
        >
          <ArrowDownUp size={16} />
          {order === 'asc' ? 'Am längsten offen zuerst' : 'Am kürzesten offen zuerst'}
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="empty">
          <PartyPopper size={48} />
          <h3>Keine offenen Hindernisse</h3>
        </div>
      ) : (
        <div className="obstacle-list">
          {entries.map(e => (
            <div key={e.id} className="obstacle-item">
              <div className="obstacle-main">
                <div className="obstacle-meta">
                  <button type="button" className="link" title="Im Journal öffnen" onClick={() => onOpenDay(e.entry_date)}>
                    {fmtDate(e.entry_date)}{e.entry_time && `, ${e.entry_time}`}
                  </button>
                  <span className="age">{openSince(e.entry_date)}</span>
                  {e.user_id !== user.id && <span className="author">{e.username}</span>}
                </div>
                <strong>{e.title || 'Ohne Titel'}</strong>
                <p className="pre">{e.obstacles}</p>
              </div>
              {project.role === 'write' && e.user_id === user.id && (
                <label className="check">
                  <input type="checkbox" checked={false} onChange={() => markDone(e.id)} />
                  Erledigt
                </label>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
