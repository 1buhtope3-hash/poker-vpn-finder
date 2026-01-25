// app.js - Основная логика приложения (ИСПРАВЛЕННАЯ ВЕРСИЯ)
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация
    initApp();
    
    // Функция инициализации
    function initApp() {
        // Заполняем datalist стран
        fillCountriesList();
        
        // Заполняем селекты для сравнения
        fillComparisonSelects();
        
        // Инициализируем поиск по румам
        initRoomSearch();
        
        // Назначаем обработчики событий
        setupEventListeners();
        
        // Показываем начальное состояние
        searchByCountry('Казахстан'); // Пример по умолчанию
    }
    
    // Заполнение списка стран
    function fillCountriesList() {
        const datalist = document.getElementById('countries-list');
        datalist.innerHTML = ''; // Очищаем перед заполнением
        pokerData.allCountries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            datalist.appendChild(option);
        });
    }
    
    // Заполнение селектов для сравнения
    function fillComparisonSelects() {
        const select1 = document.getElementById('compare-room1');
        const select2 = document.getElementById('compare-room2');
        const select3 = document.getElementById('compare-room3');
        
        // Очищаем существующие опции
        [select1, select2, select3].forEach(select => {
            // Оставляем только первую опцию
            while (select.options.length > 1) {
                select.remove(1);
            }
        });
        
        // Добавляем все румы
        Object.keys(pokerData.rooms).forEach(roomName => {
            const option = document.createElement('option');
            option.value = roomName;
            option.textContent = roomName;
            
            // Клонируем опцию для каждого селекта
            select1.appendChild(option.cloneNode(true));
            select2.appendChild(option.cloneNode(true));
            select3.appendChild(option.cloneNode(true));
        });
        
        // Обработчики изменения селектов
        [select1, select2, select3].forEach(select => {
            select.addEventListener('change', updateComparisonResults);
        });
    }
    
    // Инициализация поиска по румам
    function initRoomSearch() {
        const roomSearch = document.getElementById('room-search');
        const roomsDropdown = document.getElementById('rooms-dropdown');
        const selectedRoomsContainer = document.getElementById('selected-rooms');
        
        let selectedRooms = new Set();
        
        // Функция обновления выбранных румов
        function updateSelectedRooms() {
            selectedRoomsContainer.innerHTML = '';
            selectedRooms.forEach(roomName => {
                const tag = document.createElement('div');
                tag.className = 'room-tag';
                tag.innerHTML = `
                    ${roomName}
                    <button type="button" onclick="window.removeRoom('${roomName}')">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                selectedRoomsContainer.appendChild(tag);
            });
            
            updateRoomsResults();
        }
        
        // Глобальная функция удаления рума
        window.removeRoom = function(roomName) {
            selectedRooms.delete(roomName);
            updateSelectedRooms();
        };
        
        // Функция добавления рума
        function addRoom(roomName) {
            if (!selectedRooms.has(roomName)) {
                selectedRooms.add(roomName);
                updateSelectedRooms();
                roomSearch.value = '';
                roomsDropdown.classList.remove('active');
                roomsDropdown.innerHTML = '';
            }
        }
        
        // Обработчик ввода в поиск
        roomSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            roomsDropdown.innerHTML = '';
            
            if (searchTerm.length > 0) {
                const filteredRooms = Object.keys(pokerData.rooms).filter(roomName => 
                    roomName.toLowerCase().includes(searchTerm) && !selectedRooms.has(roomName)
                );
                
                if (filteredRooms.length > 0) {
                    filteredRooms.forEach(roomName => {
                        const option = document.createElement('div');
                        option.className = 'room-option';
                        option.textContent = roomName;
                        option.addEventListener('click', () => addRoom(roomName));
                        roomsDropdown.appendChild(option);
                    });
                    roomsDropdown.classList.add('active');
                } else {
                    roomsDropdown.classList.remove('active');
                }
            } else {
                roomsDropdown.classList.remove('active');
            }
        });
        
        // Скрытие дропдауна при клике вне его
        document.addEventListener('click', function(event) {
            if (!roomSearch.contains(event.target) && !roomsDropdown.contains(event.target)) {
                roomsDropdown.classList.remove('active');
            }
        });
        
        // Enter для добавления рума
        roomSearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && this.value.trim()) {
                const matchingRooms = Object.keys(pokerData.rooms).filter(roomName => 
                    roomName.toLowerCase() === this.value.toLowerCase().trim()
                );
                if (matchingRooms.length > 0 && !selectedRooms.has(matchingRooms[0])) {
                    addRoom(matchingRooms[0]);
                }
                this.value = '';
                roomsDropdown.classList.remove('active');
            }
        });
    }
    
    // Обновление результатов по выбранным румам
    function updateRoomsResults() {
        const selectedRoomsContainer = document.getElementById('selected-rooms');
        const allowedCountriesContainer = document.getElementById('allowed-countries');
        const disallowedCountriesContainer = document.getElementById('disallowed-countries');
        
        const roomTags = selectedRoomsContainer.querySelectorAll('.room-tag');
        const selectedRooms = Array.from(roomTags).map(tag => {
            const text = tag.textContent.trim();
            // Удаляем символ × и пробелы
            return text.replace(/\s*×\s*$/, '').trim();
        }).filter(name => name);
        
        if (selectedRooms.length === 0) {
            allowedCountriesContainer.innerHTML = '<div class="empty-state">Выберите один или несколько румов</div>';
            disallowedCountriesContainer.innerHTML = '<div class="empty-state">Выберите один или несколько румов</div>';
            return;
        }
        
        // Находим пересечение разрешенных стран
        let commonAllowedCountries = [];
        let commonDisallowedCountries = [];
        
        selectedRooms.forEach((roomName, index) => {
            const room = pokerData.rooms[roomName];
            if (!room) return;
            
            if (index === 0) {
                commonAllowedCountries = [...room.allowed];
                commonDisallowedCountries = [...room.disallowed];
            } else {
                commonAllowedCountries = commonAllowedCountries.filter(country => 
                    room.allowed.includes(country)
                );
                commonDisallowedCountries = commonDisallowedCountries.filter(country => 
                    room.disallowed.includes(country)
                );
            }
        });
        
        // Отображаем результаты
        displayCountries(commonAllowedCountries, allowedCountriesContainer, 'allowed');
        displayCountries(commonDisallowedCountries, disallowedCountriesContainer, 'disallowed');
    }
    
    // Отображение списка стран
    function displayCountries(countries, container, type) {
        container.innerHTML = '';
        
        if (countries.length === 0) {
            container.innerHTML = `<div class="empty-state" style="color: var(--text-secondary); padding: 1rem; text-align: center;">
                Нет ${type === 'allowed' ? 'разрешённых' : 'запрещённых'} стран
            </div>`;
            return;
        }
        
        // Сортируем страны и создаем теги
        countries.sort((a, b) => a.localeCompare(b, 'ru')).forEach(country => {
            const tag = document.createElement('div');
            tag.className = `country-tag ${type}`;
            tag.textContent = country;
            tag.title = country;
            container.appendChild(tag);
        });
    }
    
    // Настройка обработчиков событий
    function setupEventListeners() {
        // Поиск по стране
        const countryInput = document.getElementById('country-input');
        
        // Обработчик изменения значения
        countryInput.addEventListener('input', function() {
            searchByCountry(this.value);
        });
        
        // Обработчик для выбора из списка
        countryInput.addEventListener('change', function() {
            searchByCountry(this.value);
        });
        
        // Кнопки экспорта и обновления
        document.getElementById('export-data').addEventListener('click', exportData);
        document.getElementById('refresh-data').addEventListener('click', refreshData);
        
        // Обработчик для datalist
        document.getElementById('countries-list').addEventListener('change', function(e) {
            if (e.target.value) {
                countryInput.value = e.target.value;
                searchByCountry(e.target.value);
            }
        });
    }
    
    // Поиск по стране (ИСПРАВЛЕННАЯ ФУНКЦИЯ)
    function searchByCountry(countryName) {
        const container = document.getElementById('rooms-by-country');
        container.innerHTML = '';
        
        if (!countryName || !countryName.trim()) {
            container.innerHTML = '<div class="empty-state" style="color: var(--text-secondary); padding: 1rem; text-align: center;">Введите название страны</div>';
            return;
        }
        
        const normalizedCountry = countryName.trim();
        let hasResults = false;
        
        // Проверяем для каждого рума
        Object.entries(pokerData.rooms).forEach(([roomName, roomData]) => {
            let status = 'unknown';
            let statusText = '❓ Нет данных';
            let statusClass = 'status-unknown';
            
            // Проверяем в разрешенных странах
            const isAllowed = roomData.allowed.some(country => 
                country.toLowerCase() === normalizedCountry.toLowerCase()
            );
            
            // Проверяем в запрещенных странах
            const isDisallowed = roomData.disallowed.some(country => 
                country.toLowerCase() === normalizedCountry.toLowerCase()
            );
            
            if (isAllowed) {
                status = 'allowed';
                statusText = '✅ Разрешено';
                statusClass = 'status-allowed';
                hasResults = true;
            } else if (isDisallowed) {
                status = 'disallowed';
                statusText = '❌ Запрещено';
                statusClass = 'status-disallowed';
                hasResults = true;
            } else {
                // Если страна не найдена ни в разрешенных, ни в запрещенных
                statusText = '⚠️ Не указано';
                statusClass = 'status-unknown';
            }
            
            const roomElement = document.createElement('div');
            roomElement.className = 'room-status';
            roomElement.innerHTML = `
                <span class="room-name">${roomName}</span>
                <span class="${statusClass}">${statusText}</span>
            `;
            container.appendChild(roomElement);
        });
        
        if (!hasResults) {
            container.innerHTML = `<div class="empty-state" style="color: var(--text-secondary); padding: 1rem; text-align: center;">
                Страна "${normalizedCountry}" не найдена в разрешенных или запрещенных списках
            </div>`;
        }
    }
    
    // Обновление результатов сравнения
    function updateComparisonResults() {
        const room1 = document.getElementById('compare-room1').value;
        const room2 = document.getElementById('compare-room2').value;
        const room3 = document.getElementById('compare-room3').value;
        
        const selectedRooms = [room1, room2, room3].filter(room => room && pokerData.rooms[room]);
        
        const container = document.getElementById('common-countries');
        
        if (selectedRooms.length < 2) {
            container.innerHTML = '<div class="empty-state" style="color: var(--text-secondary); padding: 1rem; text-align: center;">Выберите хотя бы два рума для сравнения</div>';
            document.getElementById('common-count').textContent = '0 стран';
            document.getElementById('common-percentage').textContent = '0% совпадений';
            return;
        }
        
        // Находим общие разрешенные страны
        let commonCountries = [];
        selectedRooms.forEach((roomName, index) => {
            const room = pokerData.rooms[roomName];
            if (index === 0) {
                commonCountries = [...room.allowed];
            } else {
                commonCountries = commonCountries.filter(country => 
                    room.allowed.includes(country)
                );
            }
        });
        
        // Отображаем результаты
        displayCountries(commonCountries, container, 'allowed');
        
        // Обновляем статистику
        const totalRooms = selectedRooms.length;
        const avgAllowed = selectedRooms.reduce((sum, roomName) => 
            sum + pokerData.rooms[roomName].allowed.length, 0) / totalRooms;
        const percentage = avgAllowed > 0 ? 
            Math.round((commonCountries.length / avgAllowed) * 100) : 0;
        
        document.getElementById('common-count').textContent = `${commonCountries.length} стран`;
        document.getElementById('common-percentage').textContent = `${percentage}% совпадений`;
    }
    
    // Экспорт данных
    function exportData() {
        try {
            const dataStr = JSON.stringify(pokerData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = 'poker-vpn-data.json';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            showToast('Данные успешно экспортированы', 'success');
        } catch (error) {
            showToast('Ошибка при экспорте данных', 'error');
            console.error('Export error:', error);
        }
    }
    
    // Обновление данных
    function refreshData() {
        // В будущем здесь можно добавить загрузку свежих данных с сервера
        showToast('Данные уже актуальны', 'info');
    }
    
    // Утилиты
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        
        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        // Автоматическое скрытие через 3 секунды
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode === container) {
                    container.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
});
