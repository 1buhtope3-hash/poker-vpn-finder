// app.js - VPN Finder 2026
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initRoomDropdown();
    initCountryDropdown();
});

function initTheme() {
    const toggle = document.getElementById('theme-toggle');
    const icon = toggle.querySelector('i');
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'dark');
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

function initRoomDropdown() {
    const input = document.getElementById('room-input');
    const dropdown = document.getElementById('room-dropdown');
    const container = document.getElementById('selected-rooms');
    const rooms = Object.keys(pokerData.rooms);
    let selected = new Set();

    const renderTags = () => {
        container.innerHTML = '';
        selected.forEach(name => {
            const tag = document.createElement('div');
            tag.className = 'tag';
            tag.innerHTML = `${name}<button onclick="removeRoom('${name}')">&times;</button>`;
            container.appendChild(tag);
        });
        updateRoomResults();
    };

    window.removeRoom = (name) => {
        selected.delete(name);
        renderTags();
    };

    const filterRooms = (query) => {
        if (!query) return rooms.filter(r => !selected.has(r));
        const q = query.toLowerCase();
        return rooms.filter(r => r.toLowerCase().includes(q) && !selected.has(r));
    };

    const showDropdown = (items) => {
        dropdown.innerHTML = '';
        if (items.length === 0) {
            dropdown.classList.remove('active');
            return;
        }
        items.forEach(name => {
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

    input.addEventListener('focus', () => showDropdown(rooms.filter(r => !selected.has(r))));
    input.addEventListener('input', (e) => showDropdown(filterRooms(e.target.value)));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value) {
            const match = rooms.find(r => r.toLowerCase() === input.value.toLowerCase());
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
}

function initCountryDropdown() {
    const input = document.getElementById('country-input');
    const dropdown = document.getElementById('country-dropdown');
    const countries = pokerData.allCountries;

    const filterCountries = (query) => {
        if (!query) return countries;
        const q = query.toLowerCase();
        return countries.filter(c => c.toLowerCase().includes(q));
    };

    const highlightMatch = (text, query) => {
        if (!query) return text;
        const q = query.toLowerCase();
        const idx = text.toLowerCase().indexOf(q);
        if (idx === -1) return text;
        return text.slice(0, idx) + '<span class="match">' + text.slice(idx, idx + q.length) + '</span>' + text.slice(idx + q.length);
    };

    const showDropdown = (items) => {
        dropdown.innerHTML = '';
        if (items.length === 0) {
            dropdown.classList.remove('active');
            return;
        }
        items.forEach(name => {
            const div = document.createElement('div');
            div.className = 'dropdown-item';
            div.innerHTML = highlightMatch(name, input.value);
            div.addEventListener('click', () => {
                input.value = name;
                dropdown.classList.remove('active');
                searchByCountry(name);
            });
            dropdown.appendChild(div);
        });
        dropdown.classList.add('active');
    };

    input.addEventListener('focus', () => showDropdown(countries.slice(0, 50)));
    input.addEventListener('input', (e) => showDropdown(filterCountries(e.target.value)));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') dropdown.classList.remove('active');
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });

    input.addEventListener('change', (e) => {
        if (e.target.value) searchByCountry(e.target.value);
    });
}

function updateRoomResults() {
    const allowed = document.getElementById('allowed-countries');
    const disallowed = document.getElementById('disallowed-countries');
    const tags = document.querySelectorAll('#selected-rooms .tag');
    const selected = Array.from(tags).map(t => t.textContent.replace('×', '').trim());

    if (selected.length === 0) {
        allowed.innerHTML = '<div class="empty-state">Выберите румы</div>';
        disallowed.innerHTML = '<div class="empty-state">Выберите румы</div>';
        return;
    }

    let allowedSet = new Set(pokerData.rooms[selected[0]].allowed);
    let disallowedSet = new Set(pokerData.rooms[selected[0]].disallowed);

    selected.slice(1).forEach(name => {
        const room = pokerData.rooms[name];
        allowedSet = new Set([...allowedSet].filter(c => room.allowed.includes(c)));
        disallowedSet = new Set([...disallowedSet].filter(c => room.disallowed.includes(c)));
    });

    allowed.innerHTML = [...allowedSet].sort((a, b) => a.localeCompare(b, 'ru'))
        .map(c => `<div class="country-tag allowed">${c}</div>`).join('');
    disallowed.innerHTML = [...disallowedSet].sort((a, b) => a.localeCompare(b, 'ru'))
        .map(c => `<div class="country-tag disallowed">${c}</div>`).join('');
}

function searchByCountry(country) {
    const container = document.getElementById('rooms-by-country');
    const normalized = country?.trim();
    if (!normalized) {
        container.innerHTML = '<div class="empty-state">Введите название страны</div>';
        return;
    }

    let found = false;
    container.innerHTML = Object.entries(pokerData.rooms).map(([name, data]) => {
        const isAllowed = data.allowed.some(c => c.toLowerCase() === normalized.toLowerCase());
        const isDisallowed = data.disallowed.some(c => c.toLowerCase() === normalized.toLowerCase());
        if (isAllowed || isDisallowed) found = true;
        const status = isAllowed ? 'allowed' : (isDisallowed ? 'disallowed' : 'unknown');
        const text = isAllowed ? 'Разрешено' : (isDisallowed ? 'Запрещено' : 'Нет данных');
        return `<div class="room-item"><span class="room-name">${name}</span><span class="status ${status}">${text}</span></div>`;
    }).join('');

    if (!found) {
        container.innerHTML = `<div class="empty-state">Страна "${normalized}" не найдена</div>`;
    }
}
