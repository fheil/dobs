import React, { useEffect, useState } from 'react';
import { ArrowDownUp, CheckCircle2, Circle } from 'lucide-react';
import { api } from '../api';
import { addDays, fmtDate, fmtWeekday, startOfWeek, today } from '../dates';
import PeriodNav from './PeriodNav';
import ReactionBar from './ReactionBar';
import DeletedBanner from './DeletedBanner';

// Sort order is a per-browser convenience; newest day first by default.
const ORDER_KEY = 'reportNewestFirst';
const readNewestFirst = () => {
  try { return localStorage.getItem(ORDER_KEY) !== 'false'; } catch { return true; }
};

export default function ReportTab({ project, user, onOpenDay, onError }) {
  const [newestFirst, setNewestFirst] = useState(readNewestFirst);
  const [weekStart, setWeekStart] = useState(startOfWeek(today()));
  const [entries, setEntries] = useState([]);
  const [dayRange, setDayRange] = useState({ start: 0, end: 6 });
  const weekEnd = addDays(weekStart, 6);
  const days = Array.from({ length: dayRange.end - dayRange.start + 1 }, (_, i) => addDays(weekStart, dayRange.start + i));

  useEffect(() => {
    api('/auth/preferences')
      .then(c => setDayRange({ start: c.reportStartDay, end: c.reportEndDay }))
      .catch(e => onError(e.message));
  }, []);

  useEffect(() => {
    let cancelled = false;
    api(`/entries?project_id=${project.id}&from=${weekStart}&to=${weekEnd}`)
      .then(list => { if (!cancelled) setEntries(list); })
      .catch(e => onError(e.message));
    return () => { cancelled = true; };
  }, [weekStart]);

  const setReactions = (id, reactions) => setEntries(list => list.map(e => (e.id === id ? { ...e, reactions } : e)));
  const replace = updated => setEntries(list => list.map(e => (e.id === updated.id ? updated : e)));
  const drop = id => setEntries(list => list.filter(e => e.id !== id));

  const toggleOrder = () => setNewestFirst(v => {
    try { localStorage.setItem(ORDER_KEY, String(!v)); } catch { /* not persisted - fine */ }
    return !v;
  });

  // Days and the entries within a day share one direction.
  const ordered = list => (newestFirst ? [...list].reverse() : list);

  return (
    <div className="tab-content">
      <div className="section-title">
        <div className="title-with-toggle">
          <h2>Wochenreport</h2>
          <button type="button" className="secondary small" onClick={toggleOrder}>
            <ArrowDownUp size={16} />
            {newestFirst ? 'Neueste zuerst' : 'Älteste zuerst'}
          </button>
        </div>
        <PeriodNav
          label={`${fmtDate(days[0])} – ${fmtDate(days[days.length - 1])}`}
          prevTitle="Vorherige Woche"
          nextTitle="Nächste Woche"
          onPrev={() => setWeekStart(addDays(weekStart, -7))}
          onNext={() => setWeekStart(addDays(weekStart, 7))}
          onToday={() => setWeekStart(startOfWeek(today()))}
          isToday={weekStart === startOfWeek(today())}
        />
      </div>

      {ordered(days).map(day => {
        const dayEntries = ordered(entries.filter(e => e.entry_date === day));
        return (
          <section key={day} className="report-day">
            <h3>
              <button type="button" className="link" title="Im Journal öffnen" onClick={() => onOpenDay(day)}>
                {fmtWeekday(day)}
              </button>
            </h3>
            {dayEntries.length === 0 ? (
              <p className="muted">Keine Einträge</p>
            ) : (
              dayEntries.map(e => (
                <div key={e.id} className={`report-entry${e.done ? ' done' : ''}${e.deleted_at ? ' deleted' : ''}`}>
                  {e.deleted_at && <DeletedBanner entry={e} onRestored={replace} onPurged={drop} onError={onError} />}
                  <div className="report-entry-head">
                    {e.done ? <CheckCircle2 size={18} className="ok" /> : <Circle size={18} className="muted" />}
                    {e.entry_time && <span className="time">{e.entry_time}</span>}
                    <strong>{e.title || 'Ohne Titel'}</strong>
                    {e.user_id !== user.id && <span className="author">{e.author_name}</span>}
                  </div>
                  {e.content && <p className="pre">{e.content}</p>}
                  {e.obstacles && (
                    <p className={`pre obstacle${e.done ? ' solved' : ''}`}>
                      <b>Hindernisse:</b> {e.obstacles}
                    </p>
                  )}
                  {!e.deleted_at && <ReactionBar entry={e} onChange={setReactions} onError={onError} />}
                </div>
              ))
            )}
          </section>
        );
      })}
    </div>
  );
}
