/**
 * Экран онбординга (заполнение профиля)
 * Использует существующую форму из index.html
 */

class OnboardingScreen {
    constructor() {
        this.init();
    }

    init() {
        // Используем существующий экран онбординга из HTML
        // Просто управляем его показом/скрытием
    }

    show() {
        const screen = document.getElementById('onboarding-screen');
        if (screen) {
            screen.classList.add('active');
            screen.style.display = 'block';
            this.initForm();
        } else {
            // Если экрана нет, создаем временный
            this.createTemporaryScreen();
        }
    }

    hide() {
        const screen = document.getElementById('onboarding-screen');
        if (screen) {
            screen.classList.remove('active');
            screen.style.display = 'none';
        }
    }

    initForm() {
        // Инициализируем форму если нужно
        // Можно использовать существующую логику из старого app.js
    }

    createTemporaryScreen() {
        // Создаем временный экран если основной не найден
        const screen = document.createElement('div');
        screen.id = 'onboarding-screen';
        screen.className = 'screen';
        screen.innerHTML = `
            <div class="screen-content">
                <h1>Добро пожаловать в Klyro</h1>
                <p>Заполните профиль для начала работы</p>
                <button class="btn btn-primary" onclick="window.location.reload()">Начать</button>
            </div>
        `;
        document.getElementById('app').appendChild(screen);
        this.show();
    }

    async completeOnboarding(formData) {
        // Сохраняем данные профиля
        const userData = {
            ...appContext.getUserData(),
            ...formData,
            calories: Calculations.calculateCalories(formData)
        };

        await appContext.setUserData(userData);
        
        // Показываем главный экран
        hideAllScreens();
        dashboardScreen.show();
        fab.show();
        
        Helpers.showNotification('Профиль сохранен!', 'success');
    }
}

const onboardingScreen = new OnboardingScreen();

// Обновляем функцию showOnboardingScreen в app.js
window.showOnboardingScreen = () => {
    hideAllScreens();
    onboardingScreen.show();
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = OnboardingScreen;
}

