import React, { useEffect, useRef, useState } from 'react';

// A button that opens a small floating panel below it; closes on outside
// click or Escape.
export default function Popover({ label, title, className = '', children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span className="popover-anchor" ref={ref}>
      <button
        type="button"
        className={`reaction-link ${className}`}
        title={title}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        {label}
      </button>
      {open && <div className="popover" role="dialog">{children}</div>}
    </span>
  );
}
