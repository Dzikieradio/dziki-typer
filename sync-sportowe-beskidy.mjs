import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as cheerio from 'cheerio';

const SEASON_START_YEAR = 2026;
const PAST_DAYS = 3;
const FUTURE_DAYS = 21;

const SOURCES = [
  { league: 'okregowa', url: 'https://sportowebeskidy.pl/rozgrywki/liga-okregowa-zywiecko-skoczowska-2' },
  { league: 'a', url: 'https://sportowebeskidy.pl/rozgrywki/a-klasa-zywiec-6' },
  { league: 'b', url: 'https://sportowebeskidy.pl/rozgrywki/b-klasa-zywiec-6' },
  { league: 'cup', url: 'https://sportowebeskidy.pl/rozgrywki/poltent-puchar-polski-podokreg-zywiec' }
];

const MONTHS = {
  stycznia: 0, lutego: 1, marca: 2, kwietnia: 3, maja: 4, czerwca: 5,
  lipca: 6, sierpnia: 7, września: 8, października: 9, listopada: 10, grudnia: 11
};

const TEAM_ALIASES = new Map([
  ['smrek ślemień', 'LKS Ślemień'],
  ['sokół słotwina', 'LKS Słotwina'],
  ['wss wisła w wiśle', 'WSS Wisła']
]);

function clean(value) {
  return String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return clean(value).toLocaleLowerCase('pl-PL').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function canonicalTeam(value) {
  const cleaned = clean(value);
  return TEAM_ALIASES.get(cleaned.toLocaleLowerCase('pl-PL')) || cleaned;
}

function parseDay(text) {
  const match = clean(text).match(/(\d{1,2})\s+([a-ząćęłńóśźż]+)/i);
  if (!match) return null;
  const month = MONTHS[match[2].toLocaleLowerCase('pl-PL')];
  if (month === undefined) return null;
  const year = month >= 6 ? SEASON_START_YEAR : SEASON_START_YEAR + 1;
  return { year, month, day: Number(match[1]) };
}

function localIso(day, time) {
  if (!day || !/^\d{1,2}:\d{2}$/.test(time)) return null;
  const [hour, minute] = time.split(':').map(Number);
  const pad = value => String(value).padStart(2, '0');
  return `${day.year}-${pad(day.month + 1)}-${pad(day.day)}T${pad(hour)}:${pad(minute)}:00`;
}

function localDate(day) {
  if (!day) return null;
  const pad = value => String(value).padStart(2, '0');
  return `${day.year}-${pad(day.month + 1)}-${pad(day.day)}`;
}

function formatLabel(round, kickoff) {
  if (!kickoff) return `${round} • Termin do potwierdzenia`;
  const [date, time] = kickoff.split('T');
  const [year, month, day] = date.split('-');
  return `${round} • ${day}.${month}.${year} • ${time.slice(0, 5)}`;
}

function generatedId(league, round, home, away) {
  const digest = createHash('sha1').update(`${league}|${normalize(round)}|${normalize(home)}|${normalize(away)}`).digest('hex').slice(0, 8);
  return `${league}-${digest}`;
}

function readExistingMatches(source) {
  const match = source.match(/^const MATCHES=(\[[\s\S]*\]);?\s*$/);
  if (!match) throw new Error('Nie rozpoznano formatu matches.js');
  return JSON.parse(match[1]);
}

function existingIdMap(matches) {
  const map = new Map();
  for (const match of matches) {
    if (match._custom) continue;
    map.set(`${match.league}|${normalize(match.home)}|${normalize(match.away)}`, match.id);
  }
  return map;
}

function parseSchedule(html, config, ids) {
  const $ = cheerio.load(html);
  const rows = $('#terminarz table.table-allSchedule tr');
  if (!rows.length) throw new Error(`Brak tabeli terminarza: ${config.url}`);

  let round = '';
  let day = null;
  const matches = [];

  rows.each((_, row) => {
    const $row = $(row);
    const roundCell = $row.find('.round-name');
    if (roundCell.length) {
      round = clean(roundCell.text());
      return;
    }

    const dayCell = $row.find('.round-day');
    if (dayCell.length) {
      day = parseDay(dayCell.text());
      return;
    }

    const teams = $row.find('.timetable-team').map((__, cell) => canonicalTeam($(cell).text())).get();
    if (teams.length !== 2 || !round || !day) return;

    const time = clean($row.find('td.timetable').not('.timetable-number').first().text());
    const kickoff = localIso(day, time);
    const home = teams[0];
    const away = teams[1];
    const key = `${config.league}|${normalize(home)}|${normalize(away)}`;

    matches.push({
      id: ids.get(key) || generatedId(config.league, round, home, away),
      league: config.league,
      round,
      home,
      away,
      kickoff,
      date: localDate(day),
      label: formatLabel(round, kickoff),
      source: config.url
    });
  });

  if (matches.length < 3) throw new Error(`Zbyt mało meczów (${matches.length}): ${config.url}`);
  return matches;
}

function inWindow(match, now) {
  const sourceDate = match.kickoff || (match.date ? `${match.date}T12:00:00` : null);
  if (!sourceDate) return false;
  const stamp = new Date(`${sourceDate}+02:00`).getTime();
  const min = now - PAST_DAYS * 86400000;
  const max = now + FUTURE_DAYS * 86400000;
  return stamp >= min && stamp <= max;
}

async function fetchSource(config) {
  const response = await fetch(config.url, {
    headers: { 'user-agent': 'DzikiTyperFixtureSync/1.0 (+https://github.com/Dzikieradio/dziki-typer)' }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${config.url}`);
  return response.text();
}

const existingSource = await readFile('matches.js', 'utf8');
const existing = readExistingMatches(existingSource);
const ids = existingIdMap(existing);
const now = Date.now();
const collected = [];
const report = { generated_at: new Date().toISOString(), sources: [], totals: {} };

for (const config of SOURCES) {
  const html = await fetchSource(config);
  const parsed = parseSchedule(html, config, ids);
  const selected = parsed.filter(match => inWindow(match, now));
  if (!selected.length) throw new Error(`Brak meczów w aktywnym zakresie: ${config.url}`);
  collected.push(...selected);
  report.sources.push({ league: config.league, url: config.url, parsed: parsed.length, selected: selected.length });
}

collected.sort((a, b) => {
  if (!a.kickoff && !b.kickoff) return a.league.localeCompare(b.league);
  if (!a.kickoff) return 1;
  if (!b.kickoff) return -1;
  return a.kickoff.localeCompare(b.kickoff);
});

for (const match of collected) report.totals[match.league] = (report.totals[match.league] || 0) + 1;

await writeFile('matches.js', `const MATCHES=${JSON.stringify(collected)};\n`, 'utf8');
await mkdir('data', { recursive: true });
await writeFile('data/sync-report.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`Zapisano ${collected.length} meczów:`, report.totals);
