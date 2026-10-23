import React, { useEffect, useState } from 'react';
import { ArrowDownUp, CheckCircle2, Circle } from 'lucide-react';
import { api } from '../api';
import { addDays, fmtDate, fmtWeekday, startOfWeek, today } from '../dates';
import PeriodNav from './PeriodNav';
import ReactionBar from './ReactionBar';
import DeletedBanner from './DeletedBanner';

const SORTS = [
  { value: 'newest', label: 'Neueste zuerst' },
  { value: 'oldest', label: 'Älteste zuerst' },
  { value: 'best', label: 'Beste Bewertung zuerst' },
  { value: 'worst', label: 'Niedrigste Bewertung zuerst' }
];

// Sort order is a per-browser convenience; newest first by default.
const SORT_KEY = 'reportSort';
const readSort = () => {
  try {
    const v = localStorage.getItem(SORT_KEY);
    return SORTS.some(s => s.value === v) ? v : 'newest';
  } catch { return 'newest'; }
};

const ratingStats = entry => {
  const counts = entry.reactions?.ratingCounts || [];
  const total = counts.reduce((a, b) => a + b, 0);
  const avg = total ? counts.reduce((s, n, i) => s + n * (i + 1), 0) / total : null;
  return { total, avg };
};

const chronological = (a, b) =>
  a.entry_date.localeCompare(b.entry_date) || (a.entry_time || '').localeCompare(b.entry_time || '') || a.id - b.id;

// By average rating; unrated entries always go last (not rated isn't the
// same as rated badly). Ties: more ratings first, then newer first.
const byRating = direction => (a, b) => {
  const ra = ratingStats(a);
  const rb = ratingStats(b);
  if (ra.avg === null || rb.avg === null) return (ra.avg === null) - (rb.avg === null) || -chronological(a, b);
  return direction * (rb.avg - ra.avg) || rb.total - ra.total || -chronological(a, b);
};

export default function ReportTab({ project, user, onOpenDay, onError }) {
  const [sort, setSort] = useState(readSort);
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

  const changeSort = value => {
    setSort(value);
    try { localStorage.setItem(SORT_KEY, value); } catch { /* not persisted - fine */ }
  };

  // Days and the entries within a day share one direction.
  const ordered = list => (sort === 'newest' ? [...list].reverse() : list);
  const byRatingSort = sort === 'best' || sort === 'worst';
  const visible = entries.filter(e => days.includes(e.entry_date));

  const renderEntry = (e, showDate) => (
    <div key={e.id} className={`report-entry${e.done ? ' done' : ''}${e.deleted_at ? ' deleted' : ''}`}>
      {e.deleted_at && <DeletedBanner entry={e} onRestored={replace} onPurged={drop} onError={onError} />}
      <div className="report-entry-head">
        {e.done ? <CheckCircle2 size={18} className="ok" /> : <Circle size={18} className="muted" />}
        {showDate && (
          <button type="button" className="link date-link" title="Im Journal öffnen" onClick={() => onOpenDay(e.entry_date)}>
            {fmtWeekday(e.entry_date)}
          </button>
        )}
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
  );

  return (
    <div className="tab-content">
      <div className="section-title">
        <div className="title-with-toggle">
          <h2>Wochenreport</h2>
          <label className="sort-select">
            <ArrowDownUp size={16} />
            <select value={sort} onChange={e => changeSort(e.target.value)} aria-label="Sortierung">
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
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

      {byRatingSort ? (
        // Sorted by rating, day groups make no sense: one list, each entry
        // with its date.
        <section className="report-day">
          {visible.length === 0
            ? <p className="muted">Keine Einträge in dieser Woche</p>
            : [...visible].sort(byRating(sort === 'best' ? 1 : -1)).map(e => renderEntry(e, true))}
        </section>
      ) : (
        ordered(days).map(day => {
          const dayEntries = ordered(entries.filter(e => e.entry_date === day).sort(chronological));
          return (
            <section key={day} className="report-day">
              <h3>
                <button type="button" className="link" title="Im Journal öffnen" onClick={() => onOpenDay(day)}>
                  {fmtWeekday(day)}
                </button>
              </h3>
              {dayEntries.length === 0
                ? <p className="muted">Keine Einträge</p>
                : dayEntries.map(e => renderEntry(e, false))}
            </section>
          );
        })
      )}
    </div>
  );
}
