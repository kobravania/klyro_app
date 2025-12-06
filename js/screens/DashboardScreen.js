/**
 * Экран главной страницы (Dashboard)
 * Показывает текущие калории, макросы, прогресс
 */

class DashboardScreen {
    constructor() {
        this.chart = null;
        this.init();
    }

    init() {
        // Создаем HTML экрана
        this.createHTML();
        
        // Подписываемся на изменения данных
        appContext.subscribe('diary', () => this.update());
        appContext.subscribe('userData', () => this.update());
    }

    createHTML() {
        const screenHTML = `
            <div id="dashboard-screen" class="screen">
                <div class="screen-content">
                    <div class="dashboard-header">
                        <h1 class="screen-title">Сегодня</h1>
                        <p class="screen-subtitle" id="dashboard-date"></p>
                    </div>
                    
                    <div class="dashboard-stats">
                        <div class="stat-card calories-card">
                            <div class="stat-value" id="calories-current">0</div>
                            <div class="stat-label">из <span id="calories-goal">0</span> ккал</div>
                            <div class="stat-progress">
                                <div class="progress-bar" id="calories-progress"></div>
                            </div>
                        </div>
                        
                        <div class="macros-container">
                            <div class="macro-card">
                                <div class="macro-value" id="protein-value">0</div>
                                <div class="macro-label">Белки</div>
                                <div class="macro-unit">г</div>
                            </div>
                            <div class="macro-card">
                                <div class="macro-value" id="fat-value">0</div>
                                <div class="macro-label">Жиры</div>
                                <div class="macro-unit">г</div>
                            </div>
                            <div class="macro-card">
                                <div class="macro-value" id="carbs-value">0</div>
                                <div class="macro-label">Углеводы</div>
                                <div class="macro-unit">г</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="chart-container">
                        <canvas id="macros-chart"></canvas>
                    </div>
                    
                    <div class="diary-preview">
                        <h2 class="section-title">Приёмы пищи</h2>
                        <div id="diary-entries-list" class="diary-entries-list">
                            <p class="empty-state">Нет записей за сегодня</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Добавляем в app
        const app = document.getElementById('app');
        if (app) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = screenHTML;
            app.appendChild(tempDiv.firstElementChild);
        }
    }

    show() {
        const screen = document.getElementById('dashboard-screen');
        if (screen) {
            screen.classList.add('active');
            screen.style.display = 'block';
            this.update();
        }
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
        const goalCalories = appContext.getGoalCalories();
        
        // Обновляем дату
        const dateEl = document.getElementById('dashboard-date');
        if (dateEl) {
            dateEl.textContent = Helpers.formatDateDisplay(new Date());
        }
        
        // Обновляем калории
        const caloriesCurrent = Math.round(progress.kcal);
        const caloriesGoal = Math.round(goalCalories);
        const caloriesPercent = goalCalories > 0 ? Math.min((caloriesCurrent / goalCalories) * 100, 100) : 0;
        
        const caloriesCurrentEl = document.getElementById('calories-current');
        const caloriesGoalEl = document.getElementById('calories-goal');
        const caloriesProgressEl = document.getElementById('calories-progress');
        
        if (caloriesCurrentEl) caloriesCurrentEl.textContent = caloriesCurrent;
        if (caloriesGoalEl) caloriesGoalEl.textContent = caloriesGoal;
        if (caloriesProgressEl) {
            caloriesProgressEl.style.width = `${caloriesPercent}%`;
        }
        
        // Обновляем макросы
        const proteinEl = document.getElementById('protein-value');
        const fatEl = document.getElementById('fat-value');
        const carbsEl = document.getElementById('carbs-value');
        
        if (proteinEl) proteinEl.textContent = Math.round(progress.protein);
        if (fatEl) fatEl.textContent = Math.round(progress.fat);
        if (carbsEl) carbsEl.textContent = Math.round(progress.carbs);
        
        // Обновляем график
        this.updateChart(progress, goalCalories);
        
        // Обновляем список записей
        this.updateDiaryEntries(today);
    }

    updateChart(progress, goalCalories) {
        const canvas = document.getElementById('macros-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Рассчитываем целевые макросы
        const goalMacros = Calculations.calculateMacros(goalCalories);
        
        // Данные для графика
        const data = {
            labels: ['Белки', 'Жиры', 'Углеводы'],
            datasets: [{
                data: [
                    Math.round(progress.protein),
                    Math.round(progress.fat),
                    Math.round(progress.carbs)
                ],
                backgroundColor: [
                    'rgba(52, 152, 219, 0.8)',
                    'rgba(231, 76, 60, 0.8)',
                    'rgba(46, 204, 113, 0.8)'
                ],
                borderColor: [
                    'rgba(52, 152, 219, 1)',
                    'rgba(231, 76, 60, 1)',
                    'rgba(46, 204, 113, 1)'
                ],
                borderWidth: 2
            }]
        };
        
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const goal = goalMacros[label === 'Белки' ? 'protein' : label === 'Жиры' ? 'fat' : 'carbs'];
                            return `${label}: ${value}г / ${goal}г`;
                        }
                    }
                }
            }
        };
        
        // Уничтожаем старый график если есть
        if (this.chart) {
            this.chart.destroy();
        }
        
        // Создаем новый график
        if (typeof Chart !== 'undefined') {
            this.chart = new Chart(ctx, {
                type: 'doughnut',
                data: data,
                options: options
            });
        }
    }

    updateDiaryEntries(date) {
        const entries = appContext.getDiaryForDate(date);
        const listEl = document.getElementById('diary-entries-list');
        
        if (!listEl) return;
        
        if (entries.length === 0) {
            listEl.innerHTML = '<p class="empty-state">Нет записей за сегодня</p>';
            return;
        }
        
        listEl.innerHTML = entries.map(entry => `
            <div class="diary-entry-item">
                <div class="entry-name">${entry.name || 'Продукт'}</div>
                <div class="entry-details">
                    <span class="entry-grams">${Math.round(entry.grams || 0)}г</span>
                    <span class="entry-kcal">${Math.round(entry.kcal || 0)} ккал</span>
                </div>
            </div>
        `).join('');
    }
}

// Создаем глобальный экземпляр
const dashboardScreen = new DashboardScreen();

// Экспортируем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardScreen;
}

