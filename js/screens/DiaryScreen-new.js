/**
 * DiaryScreen - дневник питания
 * Дни списком, внутри дня - приёмы пищи
 */

class DiaryScreen {
    constructor() {
        this.currentDate = Helpers.getToday();
        this.init();
    }

    init() {
        this.createHTML();
        appContext.subscribe('diary', () => this.update());
    }

    createHTML() {
        const screenHTML = `
            <div id="diary-screen" class="screen">
                <div class="screen-content">
                    <div class="diary-date-header">
                        <button class="btn-icon" id="diary-prev-date" aria-label="Предыдущий день">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="15 18 9 12 15 6"/>
                            </svg>
                        </button>
                        <div class="diary-date-display" id="diary-date-display"></div>
                        <button class="btn-icon" id="diary-next-date" aria-label="Следующий день">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"/>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="diary-summary">
                        <div class="diary-summary-item">
                            <div class="stat-label">Калории</div>
                            <div class="stat-value" id="diary-total-kcal" style="font-size: 24px;">0</div>
                        </div>
                        <div class="diary-summary-item">
                            <div class="stat-label">Белки</div>
                            <div class="stat-value" id="diary-total-protein" style="font-size: 20px;">0 г</div>
                        </div>
                        <div class="diary-summary-item">
                            <div class="stat-label">Жиры</div>
                            <div class="stat-value" id="diary-total-fat" style="font-size: 20px;">0 г</div>
                        </div>
                        <div class="diary-summary-item">
                            <div class="stat-label">Углеводы</div>
                            <div class="stat-value" id="diary-total-carbs" style="font-size: 20px;">0 г</div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3 class="section-title">Записи</h3>
                        <div id="diary-entries-list" class="diary-entries-list">
                            <p class="empty-state">Нет записей за этот день</p>
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
    }

    attachHandlers() {
        const prevBtn = document.getElementById('diary-prev-date');
        const nextBtn = document.getElementById('diary-next-date');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.hapticFeedback('light');
                this.changeDate(-1);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.hapticFeedback('light');
                this.changeDate(1);
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

    changeDate(days) {
        const current = new Date(this.currentDate);
        current.setDate(current.getDate() + days);
        this.currentDate = Helpers.formatDate(current);
        this.update();
    }

    show() {
        const screen = document.getElementById('diary-screen');
        if (!screen) {
            this.createHTML();
            setTimeout(() => this.show(), 50);
            return;
        }
        
        this.currentDate = Helpers.getToday();
        hideAllScreens();
        screen.classList.add('active');
        screen.style.display = 'flex';
        screen.style.flexDirection = 'column';
        this.update();
    }

    hide() {
        const screen = document.getElementById('diary-screen');
        if (screen) {
            screen.classList.remove('active');
            screen.style.display = 'none';
        }
    }

    update() {
        const screen = document.getElementById('diary-screen');
        if (!screen) return;

        const entries = appContext.getDiaryForDate(this.currentDate);
        const progress = appContext.getDayProgress(this.currentDate);

        // Обновляем дату
        const dateDisplay = document.getElementById('diary-date-display');
        if (dateDisplay) {
            const date = new Date(this.currentDate);
            const isToday = this.currentDate === Helpers.getToday();
            if (isToday) {
                dateDisplay.textContent = 'Сегодня';
            } else {
                dateDisplay.textContent = Helpers.formatDateReadable(date);
            }
        }

        // Обновляем итоги
        const kcalEl = document.getElementById('diary-total-kcal');
        const proteinEl = document.getElementById('diary-total-protein');
        const fatEl = document.getElementById('diary-total-fat');
        const carbsEl = document.getElementById('diary-total-carbs');

        if (kcalEl) kcalEl.textContent = Math.round(progress.kcal || 0);
        if (proteinEl) proteinEl.textContent = `${Math.round(progress.protein || 0)} г`;
        if (fatEl) fatEl.textContent = `${Math.round(progress.fat || 0)} г`;
        if (carbsEl) carbsEl.textContent = `${Math.round(progress.carbs || 0)} г`;

        // Обновляем список записей
        const listEl = document.getElementById('diary-entries-list');
        if (!listEl) return;

        if (entries.length === 0) {
            listEl.innerHTML = '<p class="empty-state">Нет записей за этот день</p>';
            return;
        }

        listEl.innerHTML = entries.map(entry => `
            <div class="diary-entry" data-entry-id="${entry.id}">
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

        // Добавляем обработчики удаления (свайп или долгое нажатие)
        listEl.querySelectorAll('.diary-entry').forEach(entry => {
            entry.addEventListener('longpress', () => {
                const entryId = entry.dataset.entryId;
                this.deleteEntry(entryId);
            });
        });
    }

    async deleteEntry(entryId) {
        if (confirm('Удалить эту запись?')) {
            await appContext.removeDiaryEntry(this.currentDate, entryId);
            this.update();
            Helpers.showNotification('Запись удалена', 'success');
        }
    }
}

const diaryScreen = new DiaryScreen();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiaryScreen;
}

window.diaryScreen = diaryScreen;

