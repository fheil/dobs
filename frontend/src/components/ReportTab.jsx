import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { api } from '../api';
import { addDays, fmtDate, fmtWeekday, startOfWeek, today } from '../dates';
import PeriodNav from './PeriodNav';

export default function ReportTab({ project, user, onOpenDay, onError }) {
  const [weekStart, setWeekStart] = useState(startOfWeek(today()));
  const [entries, setEntries] = useState([]);
  const [dayRange, setDayRange] = useState({ start: 0, end: 6 });
  const weekEnd = addDays(weekStart, 6);
  const days = Array.from({ length: dayRange.end - dayRange.start + 1 }, (_, i) => addDays(weekStart, dayRange.start + i));

  useEffect(() => {
    api('/config')
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

  return (
    <div className="tab-content">
      <div className="section-title">
        <h2>Wochenreport</h2>
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

      {days.map(day => {
        const dayEntries = entries.filter(e => e.entry_date === day);
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
                <div key={e.id} className={`report-entry${e.done ? ' done' : ''}`}>
                  <div className="report-entry-head">
                    {e.done ? <CheckCircle2 size={18} className="ok" /> : <Circle size={18} className="muted" />}
                    {e.entry_time && <span className="time">{e.entry_time}</span>}
                    <strong>{e.title || 'Ohne Titel'}</strong>
                    {e.user_id !== user.id && <span className="author">{e.username}</span>}
                  </div>
                  {e.content && <p className="pre">{e.content}</p>}
                  {e.obstacles && (
                    <p className={`pre obstacle${e.done ? ' solved' : ''}`}>
                      <b>Hindernisse:</b> {e.obstacles}
                    </p>
                  )}
                </div>
              ))
            )}
          </section>
        );
      })}
    </div>
  );
}
