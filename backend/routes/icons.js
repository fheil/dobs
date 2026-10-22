import { Router } from 'express';
import { Resvg } from '@resvg/resvg-js';
import { accent, accent700 } from '../accent.js';

// App icons in the accent color, rendered once at startup - changing
// ACCENT_COLOR only needs a backend restart.
const router = Router();

const CHECK = 'M18 33l9 9 19-20';

// Browser tab / macOS: rounded tile like the in-app brand mark.
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent700}"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="url(#bg)"/>
  <path d="${CHECK}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// iOS home screen: full-bleed square (iOS rounds the corners itself and
// shows transparency as black), with the check mark a bit smaller.
const touchSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent700}"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" fill="url(#bg)"/>
  <g transform="translate(6.4 6.4) scale(0.8)">
    <path d="${CHECK}" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

const png = (svg, size) => new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();

// .ico container holding PNG images (supported by all current browsers).
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map(p => p.data)]);
}

const favicon32 = png(faviconSvg, 32);
const icons = {
  'favicon.svg': { type: 'image/svg+xml', body: Buffer.from(faviconSvg) },
  'favicon-32.png': { type: 'image/png', body: favicon32 },
  'favicon.ico': { type: 'image/x-icon', body: ico([{ size: 16, data: png(faviconSvg, 16) }, { size: 32, data: favicon32 }, { size: 48, data: png(faviconSvg, 48) }]) },
  'apple-touch-icon.png': { type: 'image/png', body: png(touchSvg, 180) }
};

router.get('/:name', (req, res) => {
  const icon = Object.hasOwn(icons, req.params.name) ? icons[req.params.name] : null;
  if (!icon) return res.status(404).end();
  // no-cache + ETag: browsers revalidate cheaply and pick up a new color.
  res.set('Cache-Control', 'no-cache').type(icon.type).send(icon.body);
});

export default router;
