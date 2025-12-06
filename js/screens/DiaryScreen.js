/**
 * Экран дневника
 * Показывает записи за выбранную дату
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
                    <div class="diary-header">
                        <button class="btn-icon" id="diary-prev-date">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="15 18 9 12 15 6"/>
                            </svg>
                        </button>
                        <div class="diary-date-selector">
                            <input type="date" id="diary-date-input" class="date-input">
                        </div>
                        <button class="btn-icon" id="diary-next-date">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"/>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="diary-summary">
                        <div class="summary-item">
                            <span class="summary-label">Калории</span>
                            <span class="summary-value" id="diary-total-kcal">0</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Белки</span>
                            <span class="summary-value" id="diary-total-protein">0 г</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Жиры</span>
                            <span class="summary-value" id="diary-total-fat">0 г</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Углеводы</span>
                            <span class="summary-value" id="diary-total-carbs">0 г</span>
                        </div>
                    </div>
                    
                    <div class="diary-entries" id="diary-entries-container">
                        <p class="empty-state">Нет записей за этот день</p>
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
        const dateInput = document.getElementById('diary-date-input');
        const prevBtn = document.getElementById('diary-prev-date');
        const nextBtn = document.getElementById('diary-next-date');

        if (dateInput) {
            dateInput.value = this.currentDate;
            dateInput.addEventListener('change', (e) => {
                this.currentDate = e.target.value;
                this.update();
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                const date = new Date(this.currentDate);
                date.setDate(date.getDate() - 1);
                this.currentDate = Helpers.formatDate(date);
                if (dateInput) dateInput.value = this.currentDate;
                this.update();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const date = new Date(this.currentDate);
                date.setDate(date.getDate() + 1);
                this.currentDate = Helpers.formatDate(date);
                if (dateInput) dateInput.value = this.currentDate;
                this.update();
            });
        }
    }

    show() {
        const screen = document.getElementById('diary-screen');
        if (screen) {
            screen.classList.add('active');
            screen.style.display = 'block';
            this.currentDate = Helpers.getToday();
            const dateInput = document.getElementById('diary-date-input');
            if (dateInput) dateInput.value = this.currentDate;
            this.update();
        }
    }

    hide() {
        const screen = document.getElementById('diary-screen');
        if (screen) {
            screen.classList.remove('active');
            screen.style.display = 'none';
        }
    }

    update() {
        const entries = appContext.getDiaryForDate(this.currentDate);
        const progress = Calculations.calculateDayProgress(entries);
        
        // Обновляем сводку
        const kcalEl = document.getElementById('diary-total-kcal');
        const proteinEl = document.getElementById('diary-total-protein');
        const fatEl = document.getElementById('diary-total-fat');
        const carbsEl = document.getElementById('diary-total-carbs');
        
        if (kcalEl) kcalEl.textContent = Math.round(progress.kcal);
        if (proteinEl) proteinEl.textContent = Math.round(progress.protein) + ' г';
        if (fatEl) fatEl.textContent = Math.round(progress.fat) + ' г';
        if (carbsEl) carbsEl.textContent = Math.round(progress.carbs) + ' г';
        
        // Обновляем список записей
        this.renderEntries(entries);
    }

    renderEntries(entries) {
        const container = document.getElementById('diary-entries-container');
        if (!container) return;
        
        if (entries.length === 0) {
            container.innerHTML = '<p class="empty-state">Нет записей за этот день</p>';
            return;
        }
        
        container.innerHTML = entries.map(entry => `
            <div class="diary-entry-card" data-entry-id="${entry.id}">
                <div class="entry-main">
                    <div class="entry-info">
                        <div class="entry-name">${entry.name || 'Продукт'}</div>
                        <div class="entry-grams">${Math.round(entry.grams || 0)}г</div>
                    </div>
                    <div class="entry-macros">
                        <span class="macro-badge protein">Б: ${Math.round(entry.protein || 0)}г</span>
                        <span class="macro-badge fat">Ж: ${Math.round(entry.fat || 0)}г</span>
                        <span class="macro-badge carbs">У: ${Math.round(entry.carbs || 0)}г</span>
                    </div>
                </div>
                <div class="entry-footer">
                    <span class="entry-kcal">${Math.round(entry.kcal || 0)} ккал</span>
                    <button class="btn-delete-entry" data-entry-id="${entry.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Добавляем обработчики удаления
        container.querySelectorAll('.btn-delete-entry').forEach(btn => {
            btn.addEventListener('click', async () => {
                const entryId = btn.dataset.entryId;
                if (confirm('Удалить эту запись?')) {
                    await appContext.removeDiaryEntry(this.currentDate, entryId);
                    Helpers.showNotification('Запись удалена', 'success');
                }
            });
        });
    }
}

const diaryScreen = new DiaryScreen();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiaryScreen;
}

