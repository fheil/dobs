import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { WEEKDAYS } from '../../dates';

const PRESETS = [
  { label: 'Mo–Fr', start: 0, end: 4 },
  { label: 'Mo–So', start: 0, end: 6 }
];

// Dual-handle slider over the weekdays: which days the Report tab lists.
export default function WeekSection() {
  const [range, setRange] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api('/config')
      .then(c => setRange({ start: c.reportStartDay, end: c.reportEndDay }))
      .catch(e => setError(e.message));
  }, []);

  const change = patch => {
    setMessage('');
    setRange(r => ({ ...r, ...patch }));
  };

  const save = async e => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const c = await api('/config', {
        method: 'PUT',
        body: JSON.stringify({ reportStartDay: range.start, reportEndDay: range.end })
      });
      setRange({ start: c.reportStartDay, end: c.reportEndDay });
      setMessage('Gespeichert.');
    } catch (x) {
      setError(x.message);
    }
  };

  if (!range) return error ? <p className="error">{error}</p> : null;

  const pct = day => (day / 6) * 100;

  return (
    <>
      <h2>Report-Woche</h2>
      <p className="muted">Welche Wochentage der Report anzeigt. Gilt für alle Benutzer.</p>

      <form onSubmit={save} className="narrow">
        <div className="preset-row">
          {PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              className={`secondary small${range.start === p.start && range.end === p.end ? ' active' : ''}`}
              onClick={() => change({ start: p.start, end: p.end })}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="range-slider">
          <div className="track" />
          <div className="track-fill" style={{ left: `${pct(range.start)}%`, width: `${pct(range.end - range.start)}%` }} />
          <input
            type="range"
            min="0"
            max="6"
            aria-label="Erster Tag"
            // Both thumbs on the same day: keep the one that can still move on top.
            style={{ zIndex: range.start === range.end && range.start > 2 ? 2 : 1 }}
            value={range.start}
            onChange={e => change({ start: Math.min(Number(e.target.value), range.end) })}
          />
          <input
            type="range"
            min="0"
            max="6"
            aria-label="Letzter Tag"
            value={range.end}
            onChange={e => change({ end: Math.max(Number(e.target.value), range.start) })}
          />
        </div>
        <div className="range-labels">
          {WEEKDAYS.map((d, i) => (
            <span key={d} className={i >= range.start && i <= range.end ? 'on' : ''}>{d}</span>
          ))}
        </div>

        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}
        <button type="submit" className="primary" style={{ marginTop: '1rem' }}>Speichern</button>
      </form>
    </>
  );
}
