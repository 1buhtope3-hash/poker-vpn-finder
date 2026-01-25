// app.js - Основная логика приложения
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
    }
    
    // Заполнение списка стран
    function fillCountriesList() {
        const datalist = document.getElementById('countries-list');
        pokerData.allCountries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            datalist.appendChild(option);
        });
    }
    
    // Заполнение селектов для сравнения
    function fillComparisonSelects() {
        const select1 = document.getElementById('compare-room1');
        const select2 = document.getElementById('compare-room2');
        const select3 = document.getElementById('compare-room3');
        
        Object.keys(pokerData.rooms).forEach(roomName => {
            [select1, select2, select3].forEach(select => {
                const option = document.createElement('option');
                option.value = roomName;
                option.textContent = roomName;
                select.appendChild(option.cloneNode(true));
            });
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
                    <button type="button" onclick="removeRoom('${roomName}')">
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
            }
        }
        
        // Обработчик ввода в поиск
        roomSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            roomsDropdown.innerHTML = '';
            
            if (searchTerm.length > 0) {
                const filteredRooms = Object.keys(pokerData.rooms).filter(roomName => 
                    roomName.toLowerCase().includes(searchTerm) && !selectedRooms.has(roomName)
                );
                
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
        });
        
        // Скрытие дропдауна при клике вне его
        document.addEventListener('click', function(event) {
            if (!roomSearch.contains(event.target) && !roomsDropdown.contains(event.target)) {
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
        const selectedRooms = Array.from(roomTags).map(tag => 
            tag.textContent.replace(/×/g, '').trim()
        );
        
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
            container.innerHTML = `<div class="empty-state">Нет ${type === 'allowed' ? 'разрешённых' : 'запрещённых'} стран</div>`;
            return;
        }
        
        countries.sort().forEach(country => {
            const tag = document.createElement('div');
            tag.className = `country-tag ${type}`;
            tag.textContent = country;
            container.appendChild(tag);
        });
    }
    
    // Настройка обработчиков событий
    function setupEventListeners() {
        // Поиск по стране
        const countryInput = document.getElementById('country-input');
        countryInput.addEventListener('input', debounce(function() {
            searchByCountry(this.value);
        }, 300));
        
        // Кнопки экспорта и обновления
        document.getElementById('export-data').addEventListener('click', exportData);
        document.getElementById('refresh-data').addEventListener('click', refreshData);
    }
    
    // Поиск по стране
    function searchByCountry(countryName) {
        const container = document.getElementById('rooms-by-country');
        container.innerHTML = '';
        
        if (!countryName.trim()) {
            container.innerHTML = '<div class="empty-state">Введите название страны</div>';
            return;
        }
        
        const normalizedCountry = countryName.trim();
        let hasResults = false;
        
        Object.entries(pokerData.rooms).forEach(([roomName, roomData]) => {
            let status = 'unknown';
            let statusText = 'Нет данных';
            
            if (roomData.allowed.includes(normalizedCountry)) {
                status = 'allowed';
                statusText = '✅ Разрешено';
                hasResults = true;
            } else if (roomData.disallowed.includes(normalizedCountry)) {
                status = 'disallowed';
                statusText = '❌ Запрещено';
                hasResults = true;
            }
            
            const roomElement = document.createElement('div');
            roomElement.className = 'room-status';
            roomElement.innerHTML = `
                <span class="room-name">${roomName}</span>
                <span class="status-${status}">${statusText}</span>
            `;
            container.appendChild(roomElement);
        });
        
        if (!hasResults) {
            container.innerHTML = `<div class="empty-state">Страна "${normalizedCountry}" не найдена в списках</div>`;
        }
    }
    
    // Обновление результатов сравнения
    function updateComparisonResults() {
        const room1 = document.getElementById('compare-room1').value;
        const room2 = document.getElementById('compare-room2').value;
        const room3 = document.getElementById('compare-room3').value;
        
        const selectedRooms = [room1, room2, room3].filter(Boolean);
        
        if (selectedRooms.length < 2) {
            document.getElementById('common-countries').innerHTML = 
                '<div class="empty-state">Выберите хотя бы два рума для сравнения</div>';
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
        const container = document.getElementById('common-countries');
        displayCountries(commonCountries, container, 'allowed');
        
        // Обновляем статистику
        const avgAllowed = selectedRooms.reduce((sum, roomName) => 
            sum + pokerData.rooms[roomName].allowed.length, 0) / selectedRooms.length;
        const percentage = avgAllowed > 0 ? 
            Math.round((commonCountries.length / avgAllowed) * 100) : 0;
        
        document.getElementById('common-count').textContent = `${commonCountries.length} стран`;
        document.getElementById('common-percentage').textContent = `${percentage}% совпадений`;
    }
    
    // Экспорт данных
    function exportData() {
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
    }
    
    // Обновление данных
    function refreshData() {
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
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => container.removeChild(toast), 300);
        }, 3000);
    }
});