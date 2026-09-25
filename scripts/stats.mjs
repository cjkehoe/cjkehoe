import { mkdir, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const DAY = 86400000;
const isoDay = date => date.toISOString().slice(0, 10);

// All metrics use UTC calendar days. The rolling window includes today.
export function computeStats(days, now = new Date()) {
  const today = isoDay(now);
  const cutoff = isoDay(new Date(Date.parse(`${today}T00:00:00Z`) - 364 * DAY));
  const ordered = [...days.entries()].filter(([d]) => d <= today).sort(([a], [b]) => a.localeCompare(b));
  let allTime = 0, last365Days = 0, longestStreak = 0, run = 0, bestDay = 0, previous;
  for (const [date, count] of ordered) {
    if (!Number.isSafeInteger(count) || count < 0) throw new Error(`Invalid count for ${date}`);
    allTime += count;
    if (date >= cutoff) last365Days += count;
    bestDay = Math.max(bestDay, count);
    run = count > 0 ? (previous && Date.parse(date) - Date.parse(previous) === DAY ? run + 1 : 1) : 0;
    longestStreak = Math.max(longestStreak, run);
    previous = date;
  }
  let cursor = Date.parse(`${today}T00:00:00Z`), currentStreak = 0;
  if (!(days.get(today) > 0)) cursor -= DAY;
  while (days.get(isoDay(new Date(cursor))) > 0) { currentStreak++; cursor -= DAY; }
  return { last365Days, allTime, currentStreak, longestStreak, bestDay };
}

async function graphql(query, variables, token) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`API HTTP ${response.status}`);
  const body = await response.json();
  if (body.errors?.length) throw new Error(body.errors.map(e => e.message).join('; '));
  if (!body.data?.user) throw new Error('User not found or missing API data');
  return body.data.user;
}

function render(stats) {
  const values = [stats.last365Days, stats.allTime, stats.currentStreak, stats.bestDay];
  const labels = ['CONTRIBUTIONS · LAST YEAR', 'CONTRIBUTIONS · ALL TIME', stats.currentStreak >= stats.longestStreak ? 'DAY STREAK · RECORD' : 'DAY STREAK', 'BEST SINGLE DAY'];
  const cells = values.map((value, i) => `<g transform="translate(${56 + i * 280},0)"><text y="116" class="number"${i === 0 ? ' fill="#a5b4fc"' : ''}>${value.toLocaleString('en-US')}</text><text y="152" class="label">${labels[i]}</text></g>`).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="200" viewBox="0 0 1200 200" role="img" aria-labelledby="title desc">
<title id="title">Contribution statistics</title><desc id="desc">${labels.map((l, i) => `${l}: ${values[i]}`).join('. ')}. UTC calendar days. Today may be empty without breaking the current streak.</desc>
<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#111827"/><stop offset="1" stop-color="#0d1117"/></linearGradient></defs>
<style>text{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif}.number{font-size:60px;font-weight:650;letter-spacing:-1px;fill:#e6edf3}.number[fill]{fill:#a5b4fc}.label{font-size:13px;letter-spacing:1.6px;fill:#a3adc2}</style>
<rect x=".5" y=".5" width="1199" height="199" rx="16" fill="url(#bg)" stroke="#252d3b"/>
<path d="M48 36H1152" stroke="#252d3b"/><path d="M48 36H110" stroke="#a5b4fc"/>
${cells}
</svg>\n`;
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is required');
  const login = process.env.USERNAME || 'cjkehoe';
  const now = new Date();
  const { createdAt } = await graphql('query($login:String!){user(login:$login){createdAt}}', { login }, token);
  const created = new Date(createdAt);
  if (!Number.isFinite(created.getTime()) || created > now) throw new Error('Invalid account creation date');
  const days = new Map();
  const query = 'query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}';
  for (let year = created.getUTCFullYear(); year <= now.getUTCFullYear(); year++) {
    const from = new Date(Math.max(created.getTime(), Date.UTC(year, 0, 1)));
    const to = new Date(Math.min(now.getTime(), Date.UTC(year + 1, 0, 1) - 1));
    const user = await graphql(query, { login, from: from.toISOString(), to: to.toISOString() }, token);
    const weeks = user.contributionsCollection?.contributionCalendar?.weeks;
    if (!Array.isArray(weeks)) throw new Error(`Missing calendar for ${year}`);
    for (const week of weeks) for (const day of week.contributionDays) {
      if (day.date >= isoDay(from) && day.date <= isoDay(to)) days.set(day.date, day.contributionCount);
    }
  }
  // Reject incomplete calendars rather than silently publishing understated totals.
  for (let time = Date.parse(`${isoDay(created)}T00:00:00Z`); time <= now.getTime(); time += DAY) {
    if (!days.has(isoDay(new Date(time)))) throw new Error(`Missing calendar day ${isoDay(new Date(time))}`);
  }
  const stats = computeStats(days, now);
  const assets = fileURLToPath(new URL('../assets/', import.meta.url));
  await mkdir(assets, { recursive: true });
  const target = resolve(assets, 'stats.svg');
  await writeFile(`${target}.tmp`, render(stats));
  await rename(`${target}.tmp`, target);
  console.log(JSON.stringify({ ...stats, asOf: isoDay(now), createdAt, calendarDays: days.size }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(`Stats generation failed: ${error.message}`); process.exitCode = 1; });
}
