// Keep only the 3D calendar from github-profile-3d-contrib output: drop the radar,
// language pie and star/fork footer, then crop to the skyline with padding.
import { readFileSync, writeFileSync } from 'node:fs';
const src = process.argv[2] ?? 'profile-3d-contrib/skyline-raw.svg';
const out = process.argv[3] ?? 'assets/skyline.svg';
let s = readFileSync(src, 'utf8');
const open = s.indexOf('<g', s.indexOf('class="fill-bg"'));
if (open < 0) throw new Error('calendar group not found');
// find matching close of the first top-level <g> (the calendar)
let depth = 0, i = open, end = -1;
const re = /<(\/?)g[\s>]/g; re.lastIndex = open;
for (let m; (m = re.exec(s)); ) { depth += m[1] ? -1 : 1; if (depth === 0) { end = s.indexOf('>', m.index) + 1; break; } }
if (end < 0) throw new Error('unbalanced svg');
const head = s.slice(0, open).replace(/<rect[^>]*class="fill-bg"[^>]*\/?>(<\/rect>)?/, '');
const cal = s.slice(open, end);
// bounding box from calendar translate() positions
const pts = [...cal.matchAll(/translate\(([\d.]+)[ ,]+([\d.]+)\)/g)].map(m => [+m[1], +m[2]]);
const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
const x0 = Math.min(...xs) - 45, x1 = Math.max(...xs) + 80, y0 = Math.min(...ys) + 55, y1 = Math.max(...ys) + 60;
const w = Math.round(x1 - x0), h = Math.round(y1 - y0);
let svg = head.replace(/width="\d+" height="\d+" viewBox="[^"]*"/, `width="${w}" height="${h}" viewBox="${x0.toFixed(0)} ${y0.toFixed(0)} ${w} ${h}"`);
svg += `<rect x="${x0.toFixed(0)}" y="${y0.toFixed(0)}" width="${w}" height="${h}" rx="16" fill="#0d1117" stroke="#252d3b"/>` + cal + '</svg>';
writeFileSync(out, svg);
console.log(`wrote ${out} ${w}x${h} from ${pts.length} cells`);
