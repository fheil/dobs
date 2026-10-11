import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Shared prev / label / next / "Heute" navigator for Journal (days) and
// Report (weeks).
export default function PeriodNav({ label, onPrev, onNext, onToday, isToday, prevTitle, nextTitle }) {
  return (
    <div className="period-nav">
      <button type="button" className="icon" title={prevTitle} onClick={onPrev}>
        <ChevronLeft size={18} />
      </button>
      {label && <span>{label}</span>}
      <button type="button" className="icon" title={nextTitle} onClick={onNext}>
        <ChevronRight size={18} />
      </button>
      <button type="button" className="icon period-today" onClick={onToday} disabled={isToday}>
        Heute
      </button>
    </div>
  );
}
