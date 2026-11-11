// Homepage chapter card 03 („ניווטים”): the printed ivory dial of the brass pocket compass that
// render_home_nav_compass.py models and renders. Seen from straight above, north up, ±dial radius across
// the texture (the renderer maps it onto the recessed dial in compass coordinates).
//   node scripts/blender/home_nav_compass_print.cjs   -> qa-output/home-map-table/maps/navcompass-gold-dial.png
// Ink only on transparency (the ivory stock is the dial's shader colour), full colour: a fine 1° / 5° / 10°
// degree ring with figures every 30°, a slim 16-point rose and serif cardinal letters.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }));

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'qa-output/home-map-table/maps');
fs.mkdirSync(out, { recursive: true });

const T = 3072;          // texture px across the dial
const R = 100;           // dial radius in SVG units
const INK = '#2a2822';
const GREEN = '#1d3a2a';
const polar = (r, deg) => [r * Math.sin(deg * Math.PI / 180), -r * Math.cos(deg * Math.PI / 180)];
const f = (v) => v.toFixed(2);

const parts = [];
// printed chapter rings
for (const [r, w, o] of [[97.2, 0.55, 0.85], [83.4, 0.35, 0.75], [71.6, 0.45, 0.8], [69.8, 0.25, 0.6]]) parts.push(`<circle r="${r}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-opacity="${o}"/>`);
// degree ring: hairline 1°, longer 5°, longest 10°
for (let deg = 0; deg < 360; deg++) {
  const [len, w] = deg % 10 === 0 ? [7.4, 0.5] : deg % 5 === 0 ? [5.0, 0.38] : [3.0, 0.24];
  const a = polar(97.2, deg), b = polar(97.2 - len, deg);
  parts.push(`<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="${INK}" stroke-width="${w}" stroke-linecap="butt"/>`);
}
// figures every 30° (the cardinals carry letters instead), upright toward the centre like an engraved scale
for (let deg = 30; deg < 360; deg += 30) {
  if (deg % 90 === 0) continue;
  parts.push(`<text transform="rotate(${deg}) translate(0 -77.4)" text-anchor="middle" dominant-baseline="central" font-family="Georgia, 'Times New Roman', serif" font-size="7.4" fill="${INK}" letter-spacing="0.2">${deg}</text>`);
}
// minor figures every 10° in the outer band (tiny, like a surveyor's dial)
for (let deg = 10; deg < 360; deg += 10) {
  if (deg % 30 === 0) continue;
  parts.push(`<text transform="rotate(${deg}) translate(0 -86.3)" text-anchor="middle" dominant-baseline="central" font-family="Georgia, 'Times New Roman', serif" font-size="3.6" fill="${INK}" fill-opacity="0.85">${deg}</text>`);
}
// the rose: 16 slim points, each split light / dark down its spine
const point = (deg, len, half, light, dark) => {
  const tip = polar(len, deg), l = polar(half, deg - 45), r = polar(half, deg + 45);
  return `<path d="M0 0L${f(l[0])} ${f(l[1])}L${f(tip[0])} ${f(tip[1])}Z" fill="${light}"/><path d="M0 0L${f(tip[0])} ${f(tip[1])}L${f(r[0])} ${f(r[1])}Z" fill="${dark}"/>` +
    `<path d="M${f(l[0])} ${f(l[1])}L${f(tip[0])} ${f(tip[1])}L${f(r[0])} ${f(r[1])}" fill="none" stroke="${INK}" stroke-width="0.28" stroke-linejoin="miter"/>`;
};
const rose = [];
for (let deg = 22.5; deg < 360; deg += 45) rose.push(point(deg, 27, 3.0, '#e6d7b6', '#9c8d6c'));
for (let deg = 45; deg < 360; deg += 90) rose.push(point(deg, 36, 4.6, '#dccaa2', '#5b5547'));
for (let deg = 0; deg < 360; deg += 90) rose.push(point(deg, 46, 6.8, '#d7c69d', '#2f3a30'));
parts.push(`<g>${rose.join('')}</g>`);
parts.push(`<circle r="14.5" fill="none" stroke="${INK}" stroke-width="0.3" stroke-opacity="0.7"/><circle r="5.4" fill="${INK}" fill-opacity="0.85"/>`);
// cardinal letters on the rose ring
for (const [deg, t] of [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W']]) {
  const [x, y] = polar(57.5, deg);
  parts.push(`<text x="${f(x)}" y="${f(y)}" text-anchor="middle" dominant-baseline="central" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="13.5" fill="${GREEN}">${t}</text>`);
}
// intercardinal dots
for (let deg = 45; deg < 360; deg += 90) { const [x, y] = polar(57.5, deg); parts.push(`<circle cx="${f(x)}" cy="${f(y)}" r="1.1" fill="${INK}"/>`); }

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}" viewBox="${-R} ${-R} ${2 * R} ${2 * R}">${parts.join('')}</svg>`;
fs.writeFileSync(path.join(out, 'navcompass-gold-dial.svg'), svg);
sharp(Buffer.from(svg)).png().toFile(path.join(out, 'navcompass-gold-dial.png')).then(() => console.log('wrote maps/navcompass-gold-dial.png'));
