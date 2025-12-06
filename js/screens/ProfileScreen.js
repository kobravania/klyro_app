/**
 * Экран профиля и настроек
 */

class ProfileScreen {
    constructor() {
        this.init();
    }

    init() {
        this.createHTML();
        appContext.subscribe('userData', () => this.update());
    }

    createHTML() {
        const screenHTML = `
            <div id="profile-screen" class="screen">
                <div class="screen-content">
                    <div class="profile-header">
                        <h1 class="screen-title">Профиль</h1>
                    </div>
                    
                    <div class="profile-card">
                        <div class="profile-avatar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                        </div>
                        <div class="profile-info" id="profile-info">
                            <div class="profile-name">Загрузка...</div>
                            <div class="profile-details">Загрузка...</div>
                        </div>
                    </div>
                    
                    <div class="profile-stats">
                        <div class="stat-item">
                            <div class="stat-value" id="profile-goal-calories">0</div>
                            <div class="stat-label">Целевые калории</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="profile-weight">-</div>
                            <div class="stat-label">Вес</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="profile-height">-</div>
                            <div class="stat-label">Рост</div>
                        </div>
                    </div>
                    
                    <div class="profile-actions">
                        <button class="btn btn-secondary btn-full" id="edit-profile-btn">
                            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Редактировать профиль
                        </button>
                    </div>
                    
                    <div class="settings-section">
                        <h2 class="section-title">Настройки</h2>
                        
                        <div class="settings-group">
                            <div class="setting-item">
                                <div class="setting-info">
                                    <div class="setting-label">Единицы измерения</div>
                                    <div class="setting-description">Метрическая система</div>
                                </div>
                                <div class="setting-value">кг, см</div>
                            </div>
                        </div>
                        
                        <div id="export-import-container" class="export-import-container"></div>
                    </div>
                </div>
            </div>
        `;

        const app = document.getElementById('app');
        if (app) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = screenHTML;
            app.appendChild(tempDiv.firstElementChild);
        }

        // Добавляем экспорт/импорт
        const container = document.getElementById('export-import-container');
        if (container) {
            container.innerHTML = exportImport.createUI();
            exportImport.attachHandlers(container);
        }

        this.attachHandlers();
        this.update();
    }

    attachHandlers() {
        const editBtn = document.getElementById('edit-profile-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.showEditProfile());
        }
    }

    show() {
        const screen = document.getElementById('profile-screen');
        if (screen) {
            screen.classList.add('active');
            screen.style.display = 'block';
            this.update();
        }
    }

    hide() {
        const screen = document.getElementById('profile-screen');
        if (screen) {
            screen.classList.remove('active');
            screen.style.display = 'none';
        }
    }

    update() {
        const userData = appContext.getUserData();
        if (!userData) {
            return;
        }
        
        // Обновляем информацию профиля
        const infoEl = document.getElementById('profile-info');
        if (infoEl) {
            const name = userData.firstName || 'Пользователь';
            const age = userData.dateOfBirth ? Helpers.getAge(userData.dateOfBirth) : userData.age || '-';
            infoEl.innerHTML = `
                <div class="profile-name">${name}</div>
                <div class="profile-details">${age} лет</div>
            `;
        }
        
        // Обновляем статистику
        const goalCalories = appContext.getGoalCalories();
        const goalCaloriesEl = document.getElementById('profile-goal-calories');
        const weightEl = document.getElementById('profile-weight');
        const heightEl = document.getElementById('profile-height');
        
        if (goalCaloriesEl) goalCaloriesEl.textContent = Math.round(goalCalories);
        if (weightEl) weightEl.textContent = userData.weight ? userData.weight + ' кг' : '-';
        if (heightEl) heightEl.textContent = userData.height ? userData.height + ' см' : '-';
    }

    showEditProfile() {
        // Показываем форму редактирования профиля (будет создана отдельно)
        Helpers.showNotification('Функция редактирования профиля в разработке', 'info');
        // TODO: Показать модальное окно или экран редактирования профиля
    }
}

const profileScreen = new ProfileScreen();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfileScreen;
}

