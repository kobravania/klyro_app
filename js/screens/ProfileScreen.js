/**
 * Экран профиля и настроек в стиле Apple
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
                    <div class="dashboard-header">
                        <h1 class="screen-title">Профиль</h1>
                    </div>
                    
                    <div class="card">
                        <div style="text-align: center; margin-bottom: var(--spacing-lg);">
                            <div class="profile-avatar" style="width: 80px; height: 80px; border-radius: 50%; background: var(--bg-elevated); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--spacing-md); color: var(--text-secondary);">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 40px; height: 40px;">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                        </div>
                            <div class="profile-name" id="profile-name" style="font-size: 24px; font-weight: 600; margin-bottom: var(--spacing-lg);">Пользователь</div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                                <div>
                                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">Целевые ккал</div>
                                    <div class="number-medium" id="profile-calories">0</div>
                                </div>
                                <div>
                                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">BMR</div>
                                    <div class="number-medium" id="profile-bmr">0</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3 class="section-title">Физические параметры</h3>
                        <div class="profile-row">
                            <span class="profile-label">Рост</span>
                            <span class="profile-value" id="profile-height">-</span>
                        </div>
                        <div class="profile-row">
                            <span class="profile-label">Вес</span>
                            <span class="profile-value" id="profile-weight">-</span>
                        </div>
                        <div class="profile-row">
                            <span class="profile-label">Возраст</span>
                            <span class="profile-value" id="profile-age">-</span>
                        </div>
                        <div class="profile-row">
                            <span class="profile-label">Пол</span>
                            <span class="profile-value" id="profile-gender">-</span>
                        </div>
                        <div class="profile-row">
                            <span class="profile-label">Активность</span>
                            <span class="profile-value" id="profile-activity">-</span>
                        </div>
                        <div class="profile-row">
                            <span class="profile-label">Цель</span>
                            <span class="profile-value" id="profile-goal">-</span>
                    </div>
                        <button class="btn btn-secondary btn-block" id="edit-profile-btn" style="margin-top: var(--spacing-md);">
                            Редактировать профиль
                        </button>
                    </div>
                    
                    <div class="card">
                        <h3 class="section-title">Настройки</h3>
                        <div class="profile-row">
                            <span class="profile-label">Единицы измерения</span>
                            <select id="units-select" class="select-input" style="max-width: 200px;">
                                <option value="metric">Метрические</option>
                                <option value="imperial">Имперские</option>
                            </select>
                            </div>
                        </div>
                        
                    <div class="card" id="export-import-section">
                        <!-- Экспорт/импорт будет добавлен через компонент -->
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

        this.attachHandlers();
        this.initExportImport();
    }

    attachHandlers() {
        const editBtn = document.getElementById('edit-profile-btn');
        const unitsSelect = document.getElementById('units-select');

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.hapticFeedback('light');
                this.showOnboarding();
            });
        }

        if (unitsSelect) {
            unitsSelect.value = appContext.settings?.units || 'metric';
            unitsSelect.addEventListener('change', async (e) => {
                this.hapticFeedback('light');
                if (!appContext.settings) appContext.settings = {};
                appContext.settings.units = e.target.value;
                await storage.setItem('klyro_units', e.target.value);
                Helpers.showNotification('Настройки сохранены', 'success');
            });
        }
    }

    initExportImport() {
        const section = document.getElementById('export-import-section');
        if (section && typeof exportImport !== 'undefined') {
            section.innerHTML = exportImport.createUI();
            exportImport.attachHandlers(section);
        }
    }

    hapticFeedback(type = 'light') {
        if (window.Telegram?.WebApp?.HapticFeedback) {
            try {
                window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
            } catch (e) {}
        }
    }

    showOnboarding() {
        if (typeof hideAllScreens === 'function') {
            hideAllScreens();
        }
        if (typeof showOnboardingScreen === 'function') {
            showOnboardingScreen();
        } else if (typeof onboardingScreen !== 'undefined') {
            onboardingScreen.show();
        }
    }

    show() {
        const screen = document.getElementById('profile-screen');
        if (screen) {
            hideAllScreens();
            screen.classList.add('active');
            screen.style.display = 'flex';
            screen.style.flexDirection = 'column';
            this.update();
        } else {
            console.error('[PROFILE] Screen element not found!');
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
        if (!userData) return;
        
        // Имя
        const nameEl = document.getElementById('profile-name');
        if (nameEl) {
            const firstName = userData.firstName || 'Пользователь';
            const lastName = userData.lastName || '';
            nameEl.textContent = `${firstName} ${lastName}`.trim();
        }

        // Калории и BMR
        const calories = appContext.getGoalCalories();
        const caloriesEl = document.getElementById('profile-calories');
        if (caloriesEl) caloriesEl.textContent = Math.round(calories);

        // BMR
        let age = null;
        if (userData.dateOfBirth) {
            age = Helpers.getAge(userData.dateOfBirth);
        } else if (userData.age) {
            age = userData.age;
        }

        if (age && userData.height && userData.weight && userData.gender) {
            const bmr = Calculations.calculateBMR(userData.weight, userData.height, age, userData.gender);
            const bmrEl = document.getElementById('profile-bmr');
            if (bmrEl) bmrEl.textContent = Math.round(bmr);
        }

        // Физические параметры
        const heightEl = document.getElementById('profile-height');
        const weightEl = document.getElementById('profile-weight');
        const ageEl = document.getElementById('profile-age');
        const genderEl = document.getElementById('profile-gender');
        const activityEl = document.getElementById('profile-activity');
        const goalEl = document.getElementById('profile-goal');

        if (heightEl) heightEl.textContent = userData.height ? `${userData.height} см` : '-';
        if (weightEl) weightEl.textContent = userData.weight ? `${userData.weight} кг` : '-';
        if (ageEl) ageEl.textContent = age ? `${age} лет` : '-';
        
        if (genderEl) {
            const genderMap = { 'male': 'Мужской', 'female': 'Женский' };
            genderEl.textContent = genderMap[userData.gender] || '-';
        }
        
        if (activityEl) {
            const activityMap = {
                'low': 'Низкая',
                'moderate': 'Умеренная',
                'high': 'Высокая'
            };
            activityEl.textContent = activityMap[userData.activity] || '-';
        }
        
        if (goalEl) {
            const goalMap = {
                'lose': 'Похудение',
                'maintain': 'Поддержание',
                'gain': 'Набор веса'
            };
            goalEl.textContent = goalMap[userData.goal] || '-';
        }
    }
}

const profileScreen = new ProfileScreen();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfileScreen;
}
