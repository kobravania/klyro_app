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
                    
                    <div class="profile-info-card">
                        <div class="profile-avatar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                        </div>
                        <div class="profile-name" id="profile-name">Пользователь</div>
                        <div class="profile-stats">
                            <div class="stat-item">
                                <div class="stat-value" id="profile-calories">0</div>
                                <div class="stat-label">Целевые ккал</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="profile-bmr">0</div>
                                <div class="stat-label">BMR</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="profile-sections">
                        <div class="section-card">
                            <h3 class="section-title">Физические параметры</h3>
                            <div class="info-row">
                                <span class="info-label">Рост:</span>
                                <span class="info-value" id="profile-height">-</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Вес:</span>
                                <span class="info-value" id="profile-weight">-</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Возраст:</span>
                                <span class="info-value" id="profile-age">-</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Пол:</span>
                                <span class="info-value" id="profile-gender">-</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Активность:</span>
                                <span class="info-value" id="profile-activity">-</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Цель:</span>
                                <span class="info-value" id="profile-goal">-</span>
                            </div>
                            <button class="btn btn-secondary btn-block" id="edit-profile-btn">
                                Редактировать профиль
                            </button>
                        </div>
                        
                        <div class="section-card">
                            <h3 class="section-title">Настройки</h3>
                            <div class="settings-item">
                                <label class="settings-label">Единицы измерения</label>
                                <select id="units-select" class="select-input">
                                    <option value="metric">Метрические (кг, см)</option>
                                    <option value="imperial">Имперские (фунты, дюймы)</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="section-card" id="export-import-section">
                            <!-- Экспорт/импорт будет добавлен через компонент -->
                        </div>
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
                this.showOnboarding();
            });
        }

        if (unitsSelect) {
            unitsSelect.value = appContext.settings.units || 'metric';
            unitsSelect.addEventListener('change', async (e) => {
                appContext.settings.units = e.target.value;
                await storage.setItem('klyro_units', e.target.value);
                Helpers.showNotification('Настройки сохранены', 'success');
            });
        }
    }

    initExportImport() {
        const section = document.getElementById('export-import-section');
        if (section) {
            section.innerHTML = exportImport.createUI();
            exportImport.attachHandlers(section);
        }
    }

    showOnboarding() {
        // Показываем форму онбординга для редактирования
        hideAllScreens();
        showOnboardingScreen();
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
