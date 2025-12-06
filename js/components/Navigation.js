/**
 * Компонент нижней навигации
 */

class Navigation {
    constructor() {
        this.currentTab = 'home';
        this.init();
    }

    init() {
        // Создаем HTML навигации
        const navHTML = `
            <nav class="bottom-nav">
                <button class="nav-item active" data-tab="home">
                    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                    <span class="nav-label">Домой</span>
                </button>
                <button class="nav-item" data-tab="diary">
                    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                    </svg>
                    <span class="nav-label">Дневник</span>
                </button>
                <button class="nav-item" data-tab="products">
                    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                        <line x1="3" y1="6" x2="21" y2="6"/>
                        <path d="M16 10a4 4 0 0 1-8 0"/>
                    </svg>
                    <span class="nav-label">Продукты</span>
                </button>
                <button class="nav-item" data-tab="activity">
                    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    <span class="nav-label">Активность</span>
                </button>
                <button class="nav-item" data-tab="profile">
                    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span class="nav-label">Профиль</span>
                </button>
            </nav>
        `;

        // Добавляем в body
        const navContainer = document.createElement('div');
        navContainer.innerHTML = navHTML;
        document.body.appendChild(navContainer.firstElementChild);

        // Добавляем обработчики
        this.attachHandlers();
    }

    attachHandlers() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const tab = item.dataset.tab;
                this.switchTab(tab);
            });
        });
    }

    switchTab(tab) {
        this.currentTab = tab;
        
        // Обновляем активное состояние
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
        
        // Вызываем событие смены таба
        window.dispatchEvent(new CustomEvent('navChange', { detail: { tab } }));
    }

    getCurrentTab() {
        return this.currentTab;
    }
}

// Создаем глобальный экземпляр
const navigation = new Navigation();

// Экспортируем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Navigation;
}

