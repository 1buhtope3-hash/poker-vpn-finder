// app.js - VPN Finder: данные собираются из Google Sheets по расписанию (data/data.json)
const STATUS_META = {
    y: { cls: 'allowed', label: 'Разрешён' },
    a: { cls: 'alternative', label: 'Альт. домен' },
    n: { cls: 'disallowed', label: 'Запрещён' },
    '': { cls: 'unknown', label: 'Нет данных' },
};

const ESC_MAP = { '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": '#39' };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => '&' + ESC_MAP[c] + ';');

let DATA = null;
let roomsByName = new Map();

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    try {
        const res = await fetch('data/data.json');
        if (!res.ok) throw new Error('Не удалось загрузить data/data.json (HTTP ' + res.status + ')');
        DATA = await res.json();
        roomsByName = new Map(DATA.rooms.map((r) => [r.name, r]));
        initRoomBlock();
        initCountryBlock();
        updateUpdatedAt();
    } catch (err) {
        console.error(err);
        showLoadError(err);
    }
});

function initTheme() {
    const toggle = document.getElementById('theme-toggle');
    const icon = toggle.querySelector('i');
    const saved = localStorage.getItem('theme');
    const theme = saved || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';

    toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        icon.className = next === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    });
}

function showLoadError(err) {
    const msg = 'Не удалось загрузить данные. Обновите страницу позже.';
    ['allowed-countries', 'disallowed-countries', 'alternative-countries', 'rooms-by-country']
        .forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<div class="empty-state">${msg}</div>`;
        });
    const updated = document.getElementById('data-updated');
    if (updated) updated.textContent = 'Данные недоступны';
    showToast('Ошибка: ' + err.message, 'error');
}

function updateUpdatedAt() {
    const el = document.getElementById('data-updated');
    if (!el) return;
    const fmt = new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
    });
    el.textContent = `Данные обновлены: ${fmt.format(new Date(DATA.updatedAt))} UTC`;
}

function showToast(text, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = text;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

/* ---------- Блок 1: румы -> страны (пересечение) ---------- */

function initRoomBlock() {
    const input = document.getElementById('room-input');
    const dropdown = document.getElementById('room-dropdown');
    const container = document.getElementById('selected-rooms');
    const rooms = DATA.rooms.map((r) => r.name);
    let selected = new Set();

    const renderTags = () => {
        container.innerHTML = '';
        selected.forEach((name) => {
            const tag = document.createElement('div');
            tag.className = 'tag';
            const label = document.createElement('span');
            label.textContent = name;
            const btn = document.createElement('button');
            btn.setAttribute('aria-label', `Убрать ${name}`);
            btn.innerHTML = '&times;';
            btn.addEventListener('click', () => {
                selected.delete(name);
                renderTags();
            });
            tag.append(label, btn);
            container.appendChild(tag);
        });
        updateRoomResults();
    };

    const filterRooms = (query) => {
        const q = query.trim().toLowerCase();
        return rooms.filter((r) => !selected.has(r) && (!q || r.toLowerCase().includes(q)));
    };

    const showDropdown = (items) => {
        dropdown.innerHTML = '';
        if (items.length === 0) {
            dropdown.classList.remove('active');
            return;
        }
        items.forEach((name) => {
            const div = document.createElement('div');
            div.className = 'dropdown-item';
            div.textContent = name;
            div.addEventListener('click', () => {
                selected.add(name);
                renderTags();
                input.value = '';
                dropdown.classList.remove('active');
            });
            dropdown.appendChild(div);
        });
        dropdown.classList.add('active');
    };

    input.addEventListener('focus', () => showDropdown(filterRooms('')));
    input.addEventListener('input', (e) => showDropdown(filterRooms(e.target.value)));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
            const match = rooms.find((r) => r.toLowerCase() === input.value.trim().toLowerCase());
            if (match && !selected.has(match)) {
                selected.add(match);
                renderTags();
            }
            input.value = '';
            dropdown.classList.remove('active');
        } else if (e.key === 'Escape') {
            dropdown.classList.remove('active');
        }
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });

    renderTags();
}

// пересечение по выбранным румам:
//   разрешено для всех -> все выбранные 'y'
//   только через альтернативу -> все 'y'/'a', хотя бы один 'a'
//   недоступно -> хотя бы один 'n' или нет данных
function computeCountries(selectedNames) {
    const allowed = [];
    const alternative = [];
    const blocked = [];
    for (const country of DATA.countries) {
        let worst = 'y';
        const altDetails = [];
        for (const name of selectedNames) {
            const room = roomsByName.get(name);
            const s = room ? room.c[country] || '' : '';
            if (s === 'n' || s === '') {
                worst = 'x';
            } else if (s === 'a' && worst !== 'x') {
                worst = 'a';
                altDetails.push(room.notes[country]
                    ? `${name}: ${room.notes[country]}`
                    : `${name}: см. примечание в оригинале таблицы`);
            }
        }
        if (worst === 'y') allowed.push(country);
        else if (worst === 'a') alternative.push([country, altDetails]);
        else blocked.push(country);
    }
    const ru = (a, b) => a.localeCompare(b, 'ru');
    return {
        allowed: allowed.sort(ru),
        alternative: alternative.sort((x, y) => ru(x[0], y[0])),
        blocked: blocked.sort(ru),
    };
}

function updateRoomResults() {
    const allowedEl = document.getElementById('allowed-countries');
    const alternativeEl = document.getElementById('alternative-countries');
    const blockedEl = document.getElementById('disallowed-countries');

    const selected = [...document.querySelectorAll('#selected-rooms .tag span')].map((s) => s.textContent);
    if (selected.length === 0) {
        const empty = '<div class="empty-state">Выберите румы</div>';
        allowedEl.innerHTML = empty;
        alternativeEl.innerHTML = empty;
        blockedEl.innerHTML = empty;
        return;
    }

    const { allowed, alternative, blocked } = computeCountries(selected);

    allowedEl.innerHTML = allowed.length
        ? allowed.map((c) => `<div class="country-tag allowed">${esc(c)}</div>`).join('')
        : '<div class="empty-state">Нет стран, разрешённых во всех выбранных румах</div>';

    alternativeEl.innerHTML = alternative.length
        ? alternative.map(([c, details]) =>
            `<div class="country-tag alternative" title="${esc(details.join('\n'))}">${esc(c)}</div>`).join('')
        : '<div class="empty-state">—</div>';

    blockedEl.innerHTML = blocked.length
        ? blocked.map((c) => `<div class="country-tag disallowed">${esc(c)}</div>`).join('')
        : '<div class="empty-state">—</div>';
}

/* ---------- Блок 2: страна -> румы ---------- */

function initCountryBlock() {
    const input = document.getElementById('country-input');
    const dropdown = document.getElementById('country-dropdown');

    const countryMatchesGroup = (group, query) => {
        const q = query.trim().toLowerCase();
        return group.countries.filter((c) => !q || c.toLowerCase().includes(q));
    };

    const showDropdown = () => {
        dropdown.innerHTML = '';
        const query = input.value;
        let total = 0;
        DATA.groups.forEach((group) => {
            const matches = countryMatchesGroup(group, query);
            if (matches.length === 0) return;
            const header = document.createElement('div');
            header.className = 'dropdown-group';
            header.textContent = group.name;
            dropdown.appendChild(header);
            matches.forEach((name) => {
                const div = document.createElement('div');
                div.className = 'dropdown-item';
                div.textContent = name;
                div.addEventListener('click', () => {
                    input.value = name;
                    dropdown.classList.remove('active');
                    searchByCountry(name);
                });
                dropdown.appendChild(div);
                total += 1;
            });
        });
        if (total === 0) {
            dropdown.classList.remove('active');
            return;
        }
        dropdown.classList.add('active');
    };

    input.addEventListener('focus', showDropdown);
    input.addEventListener('input', showDropdown);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') dropdown.classList.remove('active');
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
}

function searchByCountry(country) {
    const container = document.getElementById('rooms-by-country');
    const normalized = country?.trim();
    if (!normalized) {
        container.innerHTML = '<div class="empty-state">Введите название страны</div>';
        return;
    }

    const found = DATA.countries.some((c) => c.toLowerCase() === normalized.toLowerCase());
    if (!found) {
        container.innerHTML = `<div class="empty-state">Страна «${esc(normalized)}» не найдена</div>`;
        return;
    }

    const match = DATA.countries.find((c) => c.toLowerCase() === normalized.toLowerCase());
    const items = DATA.rooms.map((room) => {
        const s = room.c[match] || '';
        const meta = STATUS_META[s];
        const note = room.notes[match] || '';
        const chip = s === 'a' && note && note.length <= 14 ? note : meta.label;
        const title = s === 'a'
            ? (note ? `Альтернативный домен: ${note}` : 'Есть нюансы — см. примечание в оригинальной таблице')
            : meta.label;
        return `<div class="room-item${note && note.length > 14 ? ' has-note' : ''}">
            <span class="room-name">${esc(room.name)}</span>
            <span class="status ${meta.cls}" title="${esc(title)}">${esc(chip)}</span>
            ${note && note.length > 14 ? `<span class="room-note">${esc(note)}</span>` : ''}
        </div>`;
    }).join('');

    const ok = DATA.rooms.filter((room) => (room.c[match] || '') === 'y' || (room.c[match] || '') === 'a').length;
    container.innerHTML = `<div class="rooms-summary">Доступно ${ok} из ${DATA.rooms.length} румов</div>` + items;
}
