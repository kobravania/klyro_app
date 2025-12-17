/**
 * Dashboard - главный экран
 * ТОЛЬКО главное: целевые калории, съедено, осталось, donut макросов
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
                                <circle id="donut-protein" cx="50" cy="50" r="45" fill="none" stroke="#5DADE2" stroke-width="8" stroke-dasharray="0 283" transform="rotate(-90 50 50)"/>
                                <circle id="donut-fat" cx="50" cy="50" r="45" fill="none" stroke="#F39C12" stroke-width="8" stroke-dasharray="0 283" transform="rotate(-90 50 50)"/>
                                <circle id="donut-carbs" cx="50" cy="50" r="45" fill="none" stroke="#82E0AA" stroke-width="8" stroke-dasharray="0 283" transform="rotate(-90 50 50)"/>
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
                </div>
            </div>
        `;

        const app = document.getElementById('app');
        if (app) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = screenHTML;
            app.appendChild(tempDiv.firstElementChild);
        }
    }

    show() {
        const screen = document.getElementById('dashboard-screen');
        if (!screen) {
            this.createHTML();
            setTimeout(() => this.show(), 50);
            return;
        }
        
        hideAllScreens();
        screen.classList.add('active');
        screen.style.display = 'flex';
        screen.style.flexDirection = 'column';
        
        this.update();
    }

    hide() {
        const screen = document.getElementById('dashboard-screen');
        if (screen) {
            screen.classList.remove('active');
            screen.style.display = 'none';
        }
    }

    update() {
        const screen = document.getElementById('dashboard-screen');
        if (!screen) return;
        
        const today = Helpers.getToday();
        const progress = appContext.getDayProgress(today);
        const goal = appContext.getGoalCalories();
        
        const current = Math.round(progress.kcal || 0);
        const remaining = Math.max(0, goal - current);

        // Обновляем калории
        const goalEl = document.getElementById('calories-goal');
        const currentEl = document.getElementById('calories-current');
        const remainingEl = document.getElementById('calories-remaining');

        if (goalEl) goalEl.textContent = goal || 0;
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

        if (proteinEl) proteinEl.textContent = Math.round(progress.protein || 0);
        if (fatEl) fatEl.textContent = Math.round(progress.fat || 0);
        if (carbsEl) carbsEl.textContent = Math.round(progress.carbs || 0);

        // Рассчитываем цели макросов
        const proteinGoal = goal > 0 ? Math.round((goal * 0.3) / 4) : 0;
        const fatGoal = goal > 0 ? Math.round((goal * 0.3) / 9) : 0;
        const carbsGoal = goal > 0 ? Math.round((goal * 0.4) / 4) : 0;

        if (proteinGoalEl) proteinGoalEl.textContent = `/ ${proteinGoal}г`;
        if (fatGoalEl) fatGoalEl.textContent = `/ ${fatGoal}г`;
        if (carbsGoalEl) carbsGoalEl.textContent = `/ ${carbsGoal}г`;

        // Обновляем donut chart
        this.updateDonutChart(progress, goal);
    }

    updateDonutChart(progress, goal) {
        const totalEl = document.getElementById('donut-total');
        if (totalEl) totalEl.textContent = Math.round(progress.kcal || 0);

        if (!goal || goal === 0) return;

        const circumference = 2 * Math.PI * 45;
        const totalProgress = Math.min((progress.kcal || 0) / goal, 1);

        // Распределение по макросам
        const proteinKcal = (progress.protein || 0) * 4;
        const fatKcal = (progress.fat || 0) * 9;
        const carbsKcal = (progress.carbs || 0) * 4;
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
}

const dashboardScreen = new DashboardScreen();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardScreen;
}

window.dashboardScreen = dashboardScreen;

