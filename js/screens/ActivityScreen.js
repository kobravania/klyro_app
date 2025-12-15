/**
 * Экран активности в стиле Apple
 */

class ActivityScreen {
    constructor() {
        this.init();
    }

    init() {
        this.createHTML();
    }

    createHTML() {
        const screenHTML = `
            <div id="activity-screen" class="screen">
                <div class="screen-content">
                    <div class="dashboard-header">
                        <h1 class="screen-title">Активность</h1>
                    </div>
                    
                    <div class="card">
                        <p class="empty-state" style="text-align: left; padding: 0;">
                            Функция отслеживания активности находится в разработке.
                            Здесь будет возможность добавлять тренировки и учитывать их в расчёте калорий.
                        </p>
                    </div>
                    
                    <div class="card">
                        <h3 class="section-title">Рекомендации</h3>
                        <div style="line-height: 1.6; color: var(--text-secondary);">
                            <p style="margin-bottom: var(--spacing-md);">
                                Для точного расчёта калорий учитывайте свою физическую активность.
                            </p>
                            <p>
                                Уровень активности уже учтён в вашем профиле при расчёте целевых калорий.
                            </p>
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
        const screen = document.getElementById('activity-screen');
        if (screen) {
            hideAllScreens();
            screen.classList.add('active');
            screen.style.display = 'flex';
            screen.style.flexDirection = 'column';
        } else {
            console.error('[ACTIVITY] Screen element not found!');
        }
    }

    hide() {
        const screen = document.getElementById('activity-screen');
        if (screen) {
            screen.classList.remove('active');
            screen.style.display = 'none';
        }
    }
}

const activityScreen = new ActivityScreen();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActivityScreen;
}
