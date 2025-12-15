/**
 * Dashboard - главный экран в стиле Apple
 * Минимум информации, только главное
 */

class DashboardScreen {
    constructor() {
        this.init();
    }

    init() {
        this.createHTML();
        appContext.subscribe('diary', () => this.update());
        appContext.subscribe('userData', () => this.update());
    }

    createHTML() {
        const screenHTML = `
            <div id="dashboard-screen" class="screen">
                <div class="screen-content">
                    <div class="dashboard-header">
                        <h1 class="screen-title">Сегодня</h1>
                    </div>
                    
                    <div class="dashboard-stats">
                        <div class="stat-card">
                            <div class="stat-label">Цель</div>
                            <div class="stat-value" id="calories-goal">0</div>
                            <div class="stat-goal">ккал</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Съедено</div>
                            <div class="stat-value" id="calories-current">0</div>
                            <div class="stat-goal" id="calories-remaining">Осталось: 0</div>
                        </div>
                    </div>
                    
                    <div class="chart-container">
                        <div class="donut-chart" id="macros-donut">
                            <svg viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--divider)" stroke-width="8"/>
                                <circle id="donut-protein" cx="50" cy="50" r="45" fill="none" stroke="#3498db" stroke-width="8" stroke-dasharray="0 283" transform="rotate(-90 50 50)"/>
                                <circle id="donut-fat" cx="50" cy="50" r="45" fill="none" stroke="#e74c3c" stroke-width="8" stroke-dasharray="0 283" transform="rotate(-90 50 50)"/>
                                <circle id="donut-carbs" cx="50" cy="50" r="45" fill="none" stroke="#27ae60" stroke-width="8" stroke-dasharray="0 283" transform="rotate(-90 50 50)"/>
                            </svg>
                            <div class="donut-chart-center">
                                <div class="donut-chart-value" id="donut-total">0</div>
                                <div class="donut-chart-label">ккал</div>
                            </div>
                        </div>
                        
                        <div class="macros-grid">
                            <div class="macro-item">
                                <div class="macro-value" id="macro-protein">0</div>
                                <div class="macro-label">Белки</div>
                                <div class="macro-goal" id="macro-protein-goal">/ 0г</div>
                            </div>
                            <div class="macro-item">
                                <div class="macro-value" id="macro-fat">0</div>
                                <div class="macro-label">Жиры</div>
                                <div class="macro-goal" id="macro-fat-goal">/ 0г</div>
                            </div>
                            <div class="macro-item">
                                <div class="macro-value" id="macro-carbs">0</div>
                                <div class="macro-label">Углеводы</div>
                                <div class="macro-goal" id="macro-carbs-goal">/ 0г</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3 class="section-title">Дневник</h3>
                        <div id="diary-preview-list" class="diary-preview-list">
                            <p class="empty-state">Нет записей за сегодня</p>
                        </div>
                        <button class="btn btn-secondary btn-block" id="view-diary-btn" style="margin-top: var(--spacing-md);">
                            Посмотреть дневник
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
        const viewDiaryBtn = document.getElementById('view-diary-btn');
        if (viewDiaryBtn) {
            viewDiaryBtn.addEventListener('click', () => {
                this.hapticFeedback('light');
                navigation.switchTab('diary');
            });
        }
    }

    hapticFeedback(type = 'light') {
        if (window.Telegram?.WebApp?.HapticFeedback) {
            try {
                window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
            } catch (e) {}
        }
    }

    show() {
        const screen = document.getElementById('dashboard-screen');
        if (!screen) {
            console.warn('[DASHBOARD] Screen element not found, creating...');
            this.createHTML();
            // Ждем, пока элемент появится в DOM
            setTimeout(() => {
                this.show();
            }, 100);
            return;
        }
        
        hideAllScreens();
        screen.classList.add('active');
        screen.style.display = 'flex';
        screen.style.flexDirection = 'column';
        
        // Принудительно обновляем несколько раз для гарантии
        this.update();
        setTimeout(() => {
            this.update();
        }, 100);
        setTimeout(() => {
            this.update();
        }, 300);
    }

    hide() {
        const screen = document.getElementById('dashboard-screen');
        if (screen) {
            screen.classList.remove('active');
            screen.style.display = 'none';
        }
    }

    update() {
        const today = Helpers.getToday();
        const progress = appContext.getDayProgress(today);
        const userData = appContext.getUserData();
        
        const goal = appContext.getGoalCalories();
        const current = Math.round(progress.kcal);
        const remaining = Math.max(0, goal - current);

        // Обновляем калории
        const goalEl = document.getElementById('calories-goal');
        const currentEl = document.getElementById('calories-current');
        const remainingEl = document.getElementById('calories-remaining');

        if (goalEl) goalEl.textContent = goal;
        if (currentEl) currentEl.textContent = current;
        if (remainingEl) {
            remainingEl.textContent = `Осталось: ${remaining}`;
            remainingEl.style.color = remaining > 0 ? 'var(--accent-soft)' : 'var(--text-secondary)';
        }

        // Обновляем макросы
        const proteinEl = document.getElementById('macro-protein');
        const fatEl = document.getElementById('macro-fat');
        const carbsEl = document.getElementById('macro-carbs');
        const proteinGoalEl = document.getElementById('macro-protein-goal');
        const fatGoalEl = document.getElementById('macro-fat-goal');
        const carbsGoalEl = document.getElementById('macro-carbs-goal');

        if (proteinEl) proteinEl.textContent = Math.round(progress.protein);
        if (fatEl) fatEl.textContent = Math.round(progress.fat);
        if (carbsEl) carbsEl.textContent = Math.round(progress.carbs);

        // Рассчитываем цели макросов (примерно 30% белки, 30% жиры, 40% углеводы)
        const proteinGoal = Math.round((goal * 0.3) / 4);
        const fatGoal = Math.round((goal * 0.3) / 9);
        const carbsGoal = Math.round((goal * 0.4) / 4);

        if (proteinGoalEl) proteinGoalEl.textContent = `/ ${proteinGoal}г`;
        if (fatGoalEl) fatGoalEl.textContent = `/ ${fatGoal}г`;
        if (carbsGoalEl) carbsGoalEl.textContent = `/ ${carbsGoal}г`;

        // Обновляем donut chart
        this.updateDonutChart(progress, goal);

        // Обновляем превью дневника
        this.updateDiaryPreview(today);
    }

    updateDonutChart(progress, goal) {
        const totalEl = document.getElementById('donut-total');
        if (totalEl) totalEl.textContent = Math.round(progress.kcal);

        const circumference = 2 * Math.PI * 45; // радиус 45
        const totalProgress = Math.min(progress.kcal / goal, 1);

        // Распределение по макросам
        const proteinKcal = progress.protein * 4;
        const fatKcal = progress.fat * 9;
        const carbsKcal = progress.carbs * 4;
        const totalKcal = proteinKcal + fatKcal + carbsKcal;

        if (totalKcal > 0) {
            const proteinPercent = proteinKcal / totalKcal;
            const fatPercent = fatKcal / totalKcal;
            const carbsPercent = carbsKcal / totalKcal;

            const proteinDash = circumference * totalProgress * proteinPercent;
            const fatDash = circumference * totalProgress * fatPercent;
            const carbsDash = circumference * totalProgress * carbsPercent;

            const proteinEl = document.getElementById('donut-protein');
            const fatEl = document.getElementById('donut-fat');
            const carbsEl = document.getElementById('donut-carbs');

            if (proteinEl) {
                proteinEl.setAttribute('stroke-dasharray', `${proteinDash} ${circumference}`);
            }
            if (fatEl) {
                fatEl.setAttribute('stroke-dasharray', `${fatDash} ${circumference}`);
                fatEl.setAttribute('stroke-dashoffset', -proteinDash);
            }
            if (carbsEl) {
                carbsEl.setAttribute('stroke-dasharray', `${carbsDash} ${circumference}`);
                carbsEl.setAttribute('stroke-dashoffset', -(proteinDash + fatDash));
            }
        }
    }

    updateDiaryPreview(date) {
        const entries = appContext.getDiaryForDate(date);
        const listEl = document.getElementById('diary-preview-list');
        if (!listEl) return;

        if (entries.length === 0) {
            listEl.innerHTML = '<p class="empty-state">Нет записей за сегодня</p>';
            return;
        }

        // Показываем только последние 3 записи
        const recentEntries = entries.slice(-3).reverse();
        listEl.innerHTML = recentEntries.map(entry => `
            <div class="diary-entry">
                <div class="diary-entry-info">
                    <div class="diary-entry-name">${entry.name || 'Продукт'}</div>
                    <div class="diary-entry-macros">
                        <span>${Math.round(entry.protein || 0)}г Б</span>
                        <span>${Math.round(entry.fat || 0)}г Ж</span>
                        <span>${Math.round(entry.carbs || 0)}г У</span>
                    </div>
                </div>
                <div class="diary-entry-amount">${Math.round(entry.kcal || 0)} ккал</div>
            </div>
        `).join('');
    }
}

const dashboardScreen = new DashboardScreen();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardScreen;
}
