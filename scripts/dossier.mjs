// Renders assets/dossier.svg: terminal "classified dossier" hero from assets/stats.json.
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const stats = JSON.parse(readFileSync(new URL('assets/stats.json', root), 'utf8'));
const art = JSON.parse(readFileSync(new URL('.github/skyline/portrait.json', root), 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n = v => Number(v).toLocaleString('en-US');

const created = new Date(stats.createdAt), now = new Date(stats.asOf);
let months = (now.getUTCFullYear() - created.getUTCFullYear()) * 12 + now.getUTCMonth() - created.getUTCMonth();
if (now.getUTCDate() < created.getUTCDate()) months--;
const uptime = `${Math.floor(months / 12)}y ${months % 12}m`;
const lastActive = new Date(`${stats.lastActive}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const record = stats.currentStreak >= stats.longestStreak;

const W = 1200, CH = 9.03; // ~char width at 15px monospace
const rows = [
  ['Role', { t: 'builds internet products' }],
  ['Stack', { bar: 14 }],
  ['Products', { t: '[REDACTED]', c: 'red' }],
  ['Users', { bar: 8 }],
  ['Revenue', { t: 'classified', c: 'dim' }],
  ['Uptime', { t: `${uptime} on github` }],
  ['Commits', { t: `${n(stats.lastYearGitHub)} last 12mo · ${n(stats.allTime)} all-time` }],
  ['Streak', { t: `${stats.currentStreak} days${record ? ' · personal record' : ''}` }],
  ['Peak', { t: `${stats.bestDay} in one day` }],
  ['Lines', { bar: 11 }],
  ['Status', { status: true }],
];
const artX = 52, artY = 128, artLH = 19;
const infoX = 500, valX = infoX + 118, top = 96, lh = 25;
let y = top;
const info = [];
info.push(`<text x="${infoX}" y="${y}" class="mono h"><tspan class="ac">chris</tspan>@<tspan class="ac">kehoe</tspan></text>`);
y += 12; info.push(`<path d="M${infoX} ${y}H${infoX + 125}" stroke="#30363d"/>`); y += 22;
rows.forEach(([k, v], i) => {
  const d = `style="animation-delay:${(0.15 + i * 0.09).toFixed(2)}s"`;
  let val;
  if (v.bar) val = `<rect x="${valX}" y="${y - 13}" width="${(v.bar * CH).toFixed(0)}" height="16" rx="2" class="bar"/>`;
  else if (v.status) val = `<circle cx="${valX + 5}" cy="${y - 5}" r="5" class="live"/><text x="${valX + 18}" y="${y}" class="mono v">shipping · last active ${esc(lastActive)}</text>`;
  else val = `<text x="${valX}" y="${y}" class="mono v ${v.c || ''}">${esc(v.t)}</text>`;
  info.push(`<g class="row" ${d}><text x="${infoX}" y="${y}" class="mono k">${k}</text>${val}</g>`);
  y += lh;
});
const H = Math.max(y + 18, artY + art.length * artLH + 60);
const artText = art.map((l, i) => `<text x="${artX}" y="${artY + i * artLH}" xml:space="preserve">${esc(l)}</text>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="chris@kehoe. Builds internet products. ${n(stats.allTime)} contributions, ${stats.currentStreak}-day streak.">
<defs>
<linearGradient id="bg" x2="1" y2="1"><stop stop-color="#0b0f17"/><stop offset="1" stop-color="#0a0d13"/></linearGradient>
<radialGradient id="glow"><stop stop-color="#6366f1" stop-opacity=".22"/><stop offset="1" stop-color="#6366f1" stop-opacity="0"/></radialGradient>
<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#fff" opacity=".025"/></pattern>
</defs>
<style>
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace}
.h{font-size:17px;font-weight:700;fill:#e6edf3}.ac{fill:#a5b4fc}
.k{font-size:15px;font-weight:700;fill:#a5b4fc}.v{font-size:15px;fill:#e6edf3}
.red{fill:#ff6b61;font-weight:700}.dim{fill:#8b949e;font-style:italic}
.bar{fill:#c9d1d9;animation:sh 3.5s ease-in-out infinite}@keyframes sh{50%{fill:#8b949e}}
.live{fill:#3fb950;animation:bl 1.4s ease-in-out infinite}@keyframes bl{50%{opacity:.25}}.cur{fill:#a5b4fc;animation:cb 1s steps(1) infinite}@keyframes cb{50%{opacity:0}}

.art{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace;font-size:16px;font-weight:700;fill:#8b93f8;animation:gl 5s infinite}
.art .r{fill:#ff6b61;opacity:0;animation:gr 5s infinite}.art .b{fill:#58a6ff;opacity:0;animation:gb 5s infinite}
@keyframes gl{0%,90%,100%{transform:none}91%{transform:translate(3px,0)}93%{transform:translate(-2px,0)}95%{transform:none}}
@keyframes gr{0%,90%,96%,100%{opacity:0}91%,95%{opacity:.55;transform:translate(-4px,0)}}
@keyframes gb{0%,90%,96%,100%{opacity:0}91%,95%{opacity:.55;transform:translate(4px,0)}}
.t{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;fill:#8b949e}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="14" fill="url(#bg)" stroke="#252d3b"/>
<path d="M1 44H${W - 1}" stroke="#1c2230"/><rect x="1" y="1" width="${W - 2}" height="43" rx="14" fill="#11161f"/><rect x="1" y="30" width="${W - 2}" height="14" fill="#11161f"/>
<circle cx="26" cy="22" r="6" fill="#ff5f57" opacity=".85"/><circle cx="46" cy="22" r="6" fill="#febc2e" opacity=".85"/><circle cx="66" cy="22" r="6" fill="#28c840" opacity=".85"/>
<text x="${W / 2}" y="27" text-anchor="middle" class="t">chris@kehoe: ~ — whoami</text>
<ellipse cx="220" cy="${artY + art.length * artLH / 2}" rx="230" ry="150" fill="url(#glow)"/>
<g class="art"><g class="r">${artText}</g><g class="b">${artText}</g><g>${artText}</g></g>
<text x="${artX}" y="${artY + art.length * artLH + 28}" class="t">$ cat identity.txt | redact --level=max <tspan class="cur">█</tspan></text>
${info.join('\n')}
<rect x="1" y="45" width="${W - 2}" height="${H - 46}" fill="url(#scan)"/>
</svg>
`;
writeFileSync(new URL('assets/dossier.svg', root), svg);
console.log(`wrote assets/dossier.svg ${W}x${H}`);
