/**
 * Bottom Navigation - iOS style
 * Дом | Дневник | + | Активность | Профиль
 */

class Navigation {
    constructor() {
        this.currentTab = 'home';
        this.init();
    }

    init() {
        this.createHTML();
        this.attachHandlers();
    }

    createHTML() {
        const navHTML = `
            <nav class="bottom-nav" id="bottom-nav">
                <button class="nav-item active" data-tab="home" id="nav-home">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                    <span class="nav-item-label">Дом</span>
                </button>
                <button class="nav-item" data-tab="diary" id="nav-diary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    <span class="nav-item-label">Дневник</span>
                </button>
                <div class="nav-fab-wrapper">
                    <button class="nav-fab" id="nav-fab" aria-label="Добавить приём пищи">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                    </button>
                </div>
                <button class="nav-item" data-tab="activity" id="nav-activity">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    <span class="nav-item-label">Активность</span>
                </button>
                <button class="nav-item" data-tab="profile" id="nav-profile">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span class="nav-item-label">Профиль</span>
                </button>
            </nav>
        `;

        const navContainer = document.createElement('div');
        navContainer.innerHTML = navHTML;
        document.body.appendChild(navContainer.firstElementChild);
    }

    attachHandlers() {
        // Обработчики для табов
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = item.dataset.tab;
                if (tab) {
                    this.hapticFeedback('light');
                    this.switchTab(tab);
                }
            });
        });

        // Обработчик для FAB
        const fabBtn = document.getElementById('nav-fab');
        if (fabBtn) {
            fabBtn.addEventListener('click', () => {
                this.hapticFeedback('medium');
                this.openAddFood();
            });
        }
    }

    hapticFeedback(type = 'light') {
        if (window.Telegram?.WebApp?.HapticFeedback) {
            try {
                window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
            } catch (e) {
                // Игнорируем ошибки haptic feedback
            }
        }
    }

    switchTab(tab) {
        if (this.currentTab === tab) return;
        
        this.currentTab = tab;
        
        // Обновляем активное состояние
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`[data-tab="${tab}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
        
        // Вызываем событие смены таба
        window.dispatchEvent(new CustomEvent('navChange', { 
            detail: { tab } 
        }));
    }

    openAddFood() {
        window.dispatchEvent(new CustomEvent('showAddFood'));
    }

    getCurrentTab() {
        return this.currentTab;
    }

    show() {
        const nav = document.getElementById('bottom-nav');
        if (nav) {
            nav.style.display = 'flex';
        }
    }

    hide() {
        const nav = document.getElementById('bottom-nav');
        if (nav) {
            nav.style.display = 'none';
        }
    }
}

// Создаем глобальный экземпляр
const navigation = new Navigation();

// Экспортируем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Navigation;
}

// Экспортируем в глобальную область
window.navigation = navigation;

