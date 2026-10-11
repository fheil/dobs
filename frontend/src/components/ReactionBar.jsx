import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { api } from '../api';
import Popover from './Popover';

const ZERO = -1;

const fmtNumber = (n, digits = 1) => n.toLocaleString('de-DE', { maximumFractionDigits: digits });

function RatingHistogram({ counts, total, average }) {
  return (
    <div className="histogram">
      <p className="histogram-head">
        <b>{fmtNumber(average)} von 5</b> · {total} {total === 1 ? 'Bewertung' : 'Bewertungen'}
      </p>
      {[5, 4, 3, 2, 1].map(stars => {
        const n = counts[stars - 1];
        const pct = total ? Math.round((n / total) * 100) : 0;
        return (
          <div key={stars} className="histogram-row">
            <span>{stars} {stars === 1 ? 'Stern' : 'Sterne'}</span>
            <span className="histogram-bar"><span style={{ width: `${pct}%` }} /></span>
            <span className="histogram-pct">{pct} %</span>
            <span className="histogram-count">({n})</span>
          </div>
        );
      })}
    </div>
  );
}

// Feedback row under an entry: "shocked" smiley (only when the entry has an
// obstacle), own 1-5 star rating, average in %, and "offer support".
// Everyone with read access to the project may use it.
export default function ReactionBar({ entry, onChange, onError, children }) {
  const r = entry.reactions;
  const [hover, setHover] = useState(0);
  const [busy, setBusy] = useState(false);

  if (!r) return null;

  const call = async (path, body) => {
    if (busy) return;
    setBusy(true);
    try {
      onChange(entry.id, await api(`/entries/${entry.id}${path}`, { method: 'PUT', body: JSON.stringify(body) }));
    } catch (e) {
      onError?.(e.message);
    } finally {
      setBusy(false);
    }
  };

  const total = r.ratingCounts.reduce((a, b) => a + b, 0);
  const average = total ? r.ratingCounts.reduce((s, n, i) => s + n * (i + 1), 0) / total : 0;
  // hover: 0 = none, ZERO = left part of the first star ("0 Sterne").
  const shown = hover === ZERO ? 0 : hover || r.myRating || 0;

  // The left third of star 1 means "no stars" - judged by pointer position,
  // so it works for taps on touch screens too.
  const starAt = (n, e) => {
    if (n !== 1) return n;
    const box = e.currentTarget.getBoundingClientRect();
    return e.clientX - box.left < box.width / 3 ? ZERO : 1;
  };

  const rate = n => {
    if (n === ZERO) return r.myRating && call('/rating', { stars: null });
    call('/rating', { stars: r.myRating === n ? null : n });
  };
  const hasObstacle = !!entry.obstacles?.trim();

  return (
    <div className="reaction-bar">
      {hasObstacle && (
        <button
          type="button"
          className={`reaction-toggle shocked${r.myShocked ? ' on' : ''}`}
          title={`Sehr verwundert über das Hindernis${r.shocked.length ? `: ${r.shocked.join(', ')}` : ''}`}
          aria-pressed={r.myShocked}
          onClick={() => call('/reactions/shocked', { active: !r.myShocked })}
        >
          <span aria-hidden="true">😱</span>
          {r.shocked.length > 0 && <span className="count">{r.shocked.length}</span>}
        </button>
      )}

      <span className="stars" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            className={`star${n <= shown ? ' filled' : ''}${hover ? ' preview' : ''}`}
            title={n === 1 ? 'Links am ersten Stern: Bewertung entfernen' : `${n} Sterne vergeben`}
            aria-label={`${n} ${n === 1 ? 'Stern' : 'Sterne'}`}
            onMouseEnter={e => setHover(starAt(n, e))}
            onMouseMove={n === 1 ? e => setHover(starAt(1, e)) : undefined}
            onClick={e => rate(starAt(n, e))}
          >
            <Star size={18} />
          </button>
        ))}
      </span>

      {total > 0 ? (
        <Popover
          className="rating-avg"
          title="Verteilung der Bewertungen"
          label={<>{Math.round((average / 5) * 100)} % <span className="muted">({total})</span></>}
        >
          <RatingHistogram counts={r.ratingCounts} total={total} average={average} />
        </Popover>
      ) : (
        <span className="rating-avg muted">noch keine Bewertung</span>
      )}

      <span className="support-group">
        <button
          type="button"
          className={`reaction-toggle support${r.mySupport ? ' on' : ''}`}
          title={r.mySupport ? 'Unterstützungsangebot zurückziehen' : 'Unterstützung anbieten'}
          aria-pressed={r.mySupport}
          onClick={() => call('/reactions/support', { active: !r.mySupport })}
        >
          <span aria-hidden="true">🙋</span>
        </button>
        {r.support.length > 0 && (
          <Popover
            className="count"
            title="Wer Unterstützung anbietet"
            label={r.support.length}
          >
            <p className="popover-title">Bieten Unterstützung an:</p>
            <ul className="name-list">
              {r.support.map(name => <li key={name}>{name}</li>)}
            </ul>
          </Popover>
        )}
      </span>
      {children && <span className="reaction-end">{children}</span>}
    </div>
  );
}
