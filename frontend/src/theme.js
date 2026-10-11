import { api } from './api';

// Applies ACCENT_COLOR (served by the backend at runtime, so changing it
// only needs a backend restart, no frontend rebuild).
export async function loadTheme() {
  try {
    const { accentColor } = await api('/config');
    if (!accentColor) return;
    document.documentElement.style.setProperty('--accent', accentColor);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', accentColor);
  } catch {
    // Keep the built-in default color.
  }
}
