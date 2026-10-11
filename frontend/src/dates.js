// All dates are plain local "YYYY-MM-DD" strings - no time zones involved.

const pad = n => String(n).padStart(2, '0');

// Index 0 = Montag, matching config.report_start_day/report_end_day.
export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export const toIso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromIso = iso => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const today = () => toIso(new Date());

export const addDays = (iso, n) => {
  const d = fromIso(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
};

export const startOfWeek = iso => {
  const d = fromIso(iso);
  const day = d.getDay();
  return addDays(iso, day === 0 ? -6 : 1 - day);
};

export const daysBetween = (fromIsoDate, toIsoDate) =>
  Math.round((fromIso(toIsoDate) - fromIso(fromIsoDate)) / 86400000);

export const fmtDate = iso => fromIso(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const fmtLong = iso => fromIso(iso).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const fmtWeekday = iso => fromIso(iso).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' });
