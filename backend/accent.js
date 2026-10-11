// The UI accent color (ACCENT_COLOR env, "#rrggbb") and the shades derived
// from it. Must stay in sync with the color-mix() shades in styles.css.
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
export const DEFAULT_ACCENT = '#65a30d';
export const accentFromEnv = HEX_RE.test(process.env.ACCENT_COLOR || '') ? process.env.ACCENT_COLOR.toLowerCase() : null;
export const accent = accentFromEnv || DEFAULT_ACCENT;

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const toHex = parts => `#${parts.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

// Same as CSS color-mix(in srgb, <hex> <weight*100>%, <other>).
export const mix = (hex, other, weight) => {
  const a = rgb(hex);
  const b = rgb(other);
  return toHex(a.map((v, i) => v * weight + b[i] * (1 - weight)));
};

export const accent700 = mix(accent, '#000000', 0.78);
