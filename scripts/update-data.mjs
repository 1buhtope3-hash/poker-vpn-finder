// Парсер вкладки «РАБОТА РУМОВ» (GipsyTeam) -> data/data.json
// Источник: Google Visualization API (gviz), обновляется по расписанию из .github/workflows/update-data.yml

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const SHEET_ID = '1T99WJ_UVMVZ6kF0NgQvroq40Pk-erXqC9cwkE0pbFVA';
const GID = '159803688';
const SOURCE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${GID}#gid=${GID}`;
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

const CONTINENT_ROWS = new Set(['Европа', 'Азия', 'Америка', 'Африка']);
const FIRST_GROUP_NAME = 'СНГ'; // первая группа в таблице не подписана, все страны блока - СНГ

const OUT_FILE = new URL('../data/data.json', import.meta.url);

async function fetchSheet() {
  const res = await fetch(GVIZ_URL, {
    headers: { 'User-Agent': 'poker-vpn-finder-updater/1.0' },
  });
  if (!res.ok) {
    throw new Error(`gviz ответил ${res.status} (проверьте, что вкладка доступна по ссылке)`);
  }
  const text = await res.text();
  const marker = 'google.visualization.Query.setResponse(';
  const start = text.indexOf(marker);
  if (start === -1) throw new Error('Ответ не похож на gviz setResponse: ' + text.slice(0, 200));
  const end = text.lastIndexOf(');');
  return JSON.parse(text.slice(start + marker.length, end));
}

// нормализация ячейки доступности -> { s, note? }
// 'yes' = доступен, 'no' = X (запрещён), 'no_data' = пусто (нет данных), 'alt' = альтернативный домен/примечание
function normalizeStatus(cell) {
  if (!cell || cell.v == null) return { s: 'no_data' };
  const v = cell.v;
  if (typeof v === 'boolean') return v ? { s: 'yes' } : { s: 'no' };
  if (typeof v === 'number') return v !== 0 ? { s: 'yes' } : { s: 'no' };
  const t = String(v).trim();
  if (!t) return { s: 'no_data' };
  if (t === 'X' || t.toLowerCase() === 'x') return { s: 'no' };
  if (/^true$/i.test(t) || t === '1') return { s: 'yes' };
  if (/^false$/i.test(t)) return { s: 'no' };
  if (/наведи курсор/i.test(t)) return { s: 'alt', note: '' }; // подробности в hover-примечании ячейки
  return { s: 'alt', note: t }; // альтернативный домен / локальный партнер
}

const STATUS_CODES = { yes: 'y', no: 'n', no_data: '', alt: 'a' };

function buildData(table) {
  const cols = table.cols;

  // румы = колонки с непустым label (A=страна, B=служебная; у каждого рума label стоит на колонке значения, рядом колонка-маркер "1")
  const roomCols = [];
  for (let i = 2; i < cols.length; i++) {
    const label = (cols[i].label || '').trim();
    if (label) roomCols.push({ name: label, col: i });
  }

  const groups = [];
  const countries = [];
  const rooms = roomCols.map((r) => ({
    name: r.name,
    c: {}, // country -> 'y' | 'a' | 'n' | '' (нет данных)
    notes: {}, // country -> текст альтернативного домена
  }));
  const roomIndex = new Map(rooms.map((r, i) => [r.name, i]));

  for (const row of table.rows) {
    const countryCell = row.c?.[0];
    const country = typeof countryCell?.v === 'string' ? countryCell.v.trim() : null;
    if (!country || country === '1') continue; // пустые и мусорная строка

    if (CONTINENT_ROWS.has(country)) {
      groups.push({ name: country, countries: [] });
      continue;
    }

    let group = groups[groups.length - 1];
    if (!group) {
      // до первого заголовка континента идет безымянный блок СНГ
      group = { name: FIRST_GROUP_NAME, countries: [] };
      groups.push(group);
    }
    group.countries.push(country);
    countries.push(country);

    for (const room of rooms) {
      const cell = row.c?.[roomCols[roomIndex.get(room.name)].col];
      const { s, note } = normalizeStatus(cell);
      room.c[country] = STATUS_CODES[s];
      if (note) room.notes[country] = note;
    }
  }

  if (rooms.length < 25) throw new Error(`Подозрительно мало румов: ${rooms.length}`);
  if (countries.length < 80) throw new Error(`Подозрительно мало стран: ${countries.length}`);
  if (!groups.length) throw new Error('Не найдены группы континентов');

  return {
    updatedAt: new Date().toISOString(),
    source: { name: 'GipsyTeam', title: 'РАБОТА РУМОВ', url: SOURCE_URL },
    groups,
    countries,
    rooms,
  };
}

function payloadHash(data) {
  const canonical = JSON.stringify({ groups: data.groups, countries: data.countries, rooms: data.rooms });
  return createHash('sha256').update(canonical).digest('hex').slice(0, 16);
}

async function main() {
  console.log('Загружаю таблицу...');
  const table = (await fetchSheet()).table;
  const data = buildData(table);
  data.hash = payloadHash(data);

  let prev = null;
  try {
    prev = JSON.parse(readFileSync(OUT_FILE, 'utf8'));
  } catch {
    // файла еще нет
  }
  if (prev?.hash === data.hash) {
    console.log(`Данные не изменились (hash ${data.hash}), файл пропущен.`);
    return;
  }

  mkdirSync(new URL('../data', import.meta.url), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(data));
  console.log(
    `Готово: ${data.countries.length} стран, ${data.rooms.length} румов, ` +
      `${data.groups.map((g) => g.name).join(', ')}; hash ${data.hash}; updatedAt ${data.updatedAt}`
  );
}

main().catch((err) => {
  console.error('ОШИБКА:', err.message);
  process.exit(1);
});
