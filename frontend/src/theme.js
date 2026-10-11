import { api } from './api';

// Applies ACCENT_COLOR (served by the backend at runtime, so changing it
// only needs a backend restart, no frontend rebuild).
export async function loadTheme() {
  try {
    const { accentColor } = await api('/config');
    if (!accentColor) return;
    document.documentElement.style.setProperty('--accent', accentColor);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', accentColor);
    // Version the icon URLs by color so browsers don't keep a stale favicon.
    document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach(link => {
      link.href = `${link.href.split('?')[0]}?v=${accentColor.slice(1)}`;
    });
  } catch {
    // Keep the built-in default color.
  }
}
