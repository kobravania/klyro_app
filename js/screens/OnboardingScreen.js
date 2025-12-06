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
        if (typeof hideAllScreens === 'function') {
            hideAllScreens();
        }
        dashboardScreen.show();
        fab.show();
        
        Helpers.showNotification('Профиль сохранен!', 'success');
    }
}

// Адаптер для старой функции completeOnboarding из app.js
// Создаем глобальную функцию, которая будет работать со старой формой
window.completeOnboardingNew = async function() {
    try {
        // Собираем данные из формы
        const genderInput = document.querySelector('input[name="gender"]:checked');
        const heightSlider = document.getElementById('height');
        const weightSlider = document.getElementById('weight');
        const activityInput = document.querySelector('input[name="activity"]:checked');
        const goalInput = document.querySelector('input[name="goal"]:checked');
        const dateOfBirthValue = document.getElementById('dateOfBirthValue');
        const dateInput = document.getElementById('dateOfBirth');
        
        let userData = appContext.getUserData() || {};
        
        // Дата рождения
        if (dateOfBirthValue && dateOfBirthValue.value) {
            userData.dateOfBirth = dateOfBirthValue.value;
            userData.age = Helpers.getAge(dateOfBirthValue.value);
        } else if (dateInput && dateInput.value) {
            const dateMatch = dateInput.value.match(/(\d{2})\.(\d{2})\.(\d{4})/);
            if (dateMatch) {
                const day = parseInt(dateMatch[1]);
                const month = parseInt(dateMatch[2]) - 1;
                const year = parseInt(dateMatch[3]);
                const date = new Date(year, month, day);
                if (!isNaN(date.getTime())) {
                    userData.dateOfBirth = date.toISOString().split('T')[0];
                    userData.age = Helpers.getAge(userData.dateOfBirth);
                }
            }
        }
        
        // Остальные данные
        if (genderInput) userData.gender = genderInput.value;
        if (heightSlider) userData.height = parseInt(heightSlider.value);
        if (weightSlider) userData.weight = parseFloat(weightSlider.value);
        if (activityInput) userData.activity = activityInput.value;
        if (goalInput) userData.goal = goalInput.value;
        
        // Рассчитываем калории
        userData.calories = Calculations.calculateCalories(userData);
        
        // Сохраняем через новый контекст
        await appContext.setUserData(userData);
        
        // Показываем главный экран
        if (typeof hideAllScreens === 'function') {
            hideAllScreens();
        }
        dashboardScreen.show();
        fab.show();
        
        Helpers.showNotification('Профиль сохранен!', 'success');
    } catch (e) {
        console.error('[ONBOARDING] Error:', e);
        Helpers.showNotification('Ошибка при сохранении данных', 'error');
    }
};

// Если старая функция completeOnboarding существует, переопределяем её
if (typeof window.completeOnboarding === 'function') {
    const oldCompleteOnboarding = window.completeOnboarding;
    window.completeOnboarding = async function() {
        // Пробуем использовать новую функцию
        if (typeof window.completeOnboardingNew === 'function') {
            await window.completeOnboardingNew();
        } else {
            // Fallback на старую
            await oldCompleteOnboarding();
        }
    };
} else {
    // Если старой функции нет, создаем новую
    window.completeOnboarding = window.completeOnboardingNew;
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

