/**
 * Экран активности / спорта
 */

class ActivityScreen {
    constructor() {
        this.activities = [];
        this.init();
    }

    init() {
        this.createHTML();
        this.loadActivities();
        appContext.subscribe('activities', () => this.loadActivities());
    }

    createHTML() {
        const screenHTML = `
            <div id="activity-screen" class="screen">
                <div class="screen-content">
                    <div class="activity-header">
                        <h1 class="screen-title">Активность</h1>
                        <button class="btn btn-primary" id="add-activity-btn">
                            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Добавить
                        </button>
                    </div>
                    
                    <div class="activities-list" id="activities-list">
                        <p class="empty-state">Нет записей активности</p>
                    </div>
                </div>
            </div>
            
            <!-- Модальное окно добавления активности -->
            <div id="add-activity-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Добавить активность</h2>
                        <button class="btn-close-modal" id="close-activity-modal">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Название активности</label>
                            <select id="activity-name-select" class="form-input">
                                <option value="">Выберите активность</option>
                                <option value="Бег">Бег</option>
                                <option value="Ходьба">Ходьба</option>
                                <option value="Велосипед">Велосипед</option>
                                <option value="Плавание">Плавание</option>
                                <option value="Тренажерный зал">Тренажерный зал</option>
                                <option value="Йога">Йога</option>
                                <option value="Танцы">Танцы</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Длительность (минуты)</label>
                            <input type="number" id="activity-duration" class="form-input" min="1" step="1" value="30">
                        </div>
                        <div class="form-group">
                            <label class="form-checkbox">
                                <input type="checkbox" id="add-activity-to-diary" checked>
                                <span>Добавить в дневник</span>
                            </label>
                        </div>
                        <button class="btn btn-primary btn-large" id="save-activity-btn">
                            Сохранить
                        </button>
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
    }

    attachHandlers() {
        const addBtn = document.getElementById('add-activity-btn');
        const closeModalBtn = document.getElementById('close-activity-modal');
        const saveBtn = document.getElementById('save-activity-btn');
        const modal = document.getElementById('add-activity-modal');

        if (addBtn) {
            addBtn.addEventListener('click', () => this.showModal());
        }

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.hideModal());
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveActivity());
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal();
                }
            });
        }
    }

    show() {
        const screen = document.getElementById('activity-screen');
        if (screen) {
            screen.classList.add('active');
            screen.style.display = 'block';
            this.loadActivities();
        }
    }

    hide() {
        const screen = document.getElementById('activity-screen');
        if (screen) {
            screen.classList.remove('active');
            screen.style.display = 'none';
        }
    }

    showModal() {
        const modal = document.getElementById('add-activity-modal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    hideModal() {
        const modal = document.getElementById('add-activity-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    loadActivities() {
        const activitiesStr = storage.getItemSync('klyro_activities');
        if (activitiesStr) {
            try {
                this.activities = JSON.parse(activitiesStr);
            } catch (e) {
                console.error('[ACTIVITY] Error parsing activities:', e);
                this.activities = [];
            }
        } else {
            this.activities = [];
        }
        this.renderActivities();
    }

    renderActivities() {
        const listEl = document.getElementById('activities-list');
        if (!listEl) return;
        
        if (this.activities.length === 0) {
            listEl.innerHTML = '<p class="empty-state">Нет записей активности</p>';
            return;
        }
        
        // Сортируем по дате (новые сверху)
        const sorted = [...this.activities].sort((a, b) => {
            const dateA = new Date(a.date || a.timestamp);
            const dateB = new Date(b.date || b.timestamp);
            return dateB - dateA;
        });
        
        listEl.innerHTML = sorted.slice(0, 20).map(activity => `
            <div class="activity-card">
                <div class="activity-info">
                    <div class="activity-name">${activity.name || 'Активность'}</div>
                    <div class="activity-details">
                        <span>${activity.duration || 0} мин</span>
                        <span>•</span>
                        <span>${Math.round(activity.kcal || 0)} ккал</span>
                    </div>
                </div>
                <div class="activity-date">
                    ${Helpers.formatDateDisplay(activity.date || activity.timestamp)}
                </div>
            </div>
        `).join('');
    }

    async saveActivity() {
        const name = document.getElementById('activity-name-select')?.value;
        const duration = parseFloat(document.getElementById('activity-duration')?.value) || 0;
        const addToDiary = document.getElementById('add-activity-to-diary')?.checked || false;
        
        if (!name || !duration) {
            Helpers.showNotification('Заполните все поля', 'error');
            return;
        }
        
        // MET значения для разных активностей
        const activityMET = {
            'Бег': 8,
            'Ходьба': 3.5,
            'Велосипед': 6,
            'Плавание': 7,
            'Тренажерный зал': 5,
            'Йога': 3,
            'Танцы': 5
        };
        
        const met = activityMET[name] || 5;
        const userData = appContext.getUserData();
        const weight = userData?.weight || 70;
        const kcal = Math.round((met * weight * duration) / 60);
        
        const activity = {
            id: Date.now().toString(),
            name: name,
            duration: duration,
            kcal: kcal,
            date: Helpers.getToday(),
            timestamp: new Date().toISOString()
        };
        
        this.activities.push(activity);
        await storage.setItem('klyro_activities', JSON.stringify(this.activities));
        
        // Если нужно добавить в дневник
        if (addToDiary) {
            const entry = {
                id: Date.now().toString() + '_activity',
                name: `Активность: ${name}`,
                grams: 0,
                kcal: kcal,
                protein: 0,
                fat: 0,
                carbs: 0,
                timestamp: new Date().toISOString(),
                isActivity: true
            };
            await appContext.addDiaryEntry(Helpers.getToday(), entry);
        }
        
        Helpers.showNotification('Активность добавлена', 'success');
        this.hideModal();
        this.loadActivities();
        
        // Очищаем форму
        document.getElementById('activity-name-select').value = '';
        document.getElementById('activity-duration').value = '30';
    }
}

const activityScreen = new ActivityScreen();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActivityScreen;
}

