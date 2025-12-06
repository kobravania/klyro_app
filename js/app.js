/**
 * Главный файл приложения Klyro
 * Новая модульная архитектура с сохранением всех старых данных
 */

// Инициализация приложения
async function initApp() {
    try {
        // Инициализируем контекст приложения
        await appContext.init();
        
        // КРИТИЧНО: Проверяем наличие профиля ПЕРЕД показом экранов
        // Исправляет проблему с повторным показом формы
        const hasProfile = appContext.hasCompleteProfile();
        
        console.log('[APP] Profile check:', {
            hasProfile,
            userData: appContext.getUserData(),
            hasDate: !!(appContext.getUserData()?.dateOfBirth || appContext.getUserData()?.age),
            hasHeight: !!appContext.getUserData()?.height
        });
        
        if (hasProfile) {
            // Профиль есть - показываем главный экран
            hideAllScreens();
            dashboardScreen.show();
            fab.show();
        } else {
            // Профиля нет - показываем форму онбординга
            hideAllScreens();
            showOnboardingScreen();
            fab.hide();
        }
        
        // Настраиваем навигацию
        setupNavigation();
        
        // Загружаем продукты в фоне
        appContext.loadProducts();
        
    } catch (e) {
        console.error('[APP] Initialization error:', e);
        Helpers.showNotification('Ошибка при запуске приложения', 'error');
        // Показываем форму онбординга в случае ошибки
        hideAllScreens();
        showOnboardingScreen();
    }
}

// Скрыть все экраны
function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
        screen.style.display = 'none';
    });
}

// Показать экран онбординга (временная функция, будет заменена компонентом)
function showOnboardingScreen() {
    // Ищем существующий экран онбординга или создаем временный
    let onboardingScreen = document.getElementById('onboarding-screen');
    if (!onboardingScreen) {
        onboardingScreen = document.createElement('div');
        onboardingScreen.id = 'onboarding-screen';
        onboardingScreen.className = 'screen';
        onboardingScreen.innerHTML = `
            <div class="screen-content">
                <h1>Добро пожаловать в Klyro</h1>
                <p>Заполните профиль для начала работы</p>
                <button onclick="window.location.reload()">Начать</button>
            </div>
        `;
        document.getElementById('app').appendChild(onboardingScreen);
    }
    onboardingScreen.classList.add('active');
    onboardingScreen.style.display = 'block';
}

// Настройка навигации
function setupNavigation() {
    window.addEventListener('navChange', (e) => {
        const tab = e.detail.tab;
        hideAllScreens();
        
        switch(tab) {
            case 'home':
                dashboardScreen.show();
                fab.show();
                break;
            case 'diary':
                // TODO: Показать экран дневника
                fab.show();
                break;
            case 'products':
                // TODO: Показать экран продуктов
                fab.hide();
                break;
            case 'activity':
                // TODO: Показать экран активности
                fab.hide();
                break;
            case 'profile':
                // TODO: Показать экран профиля
                fab.hide();
                break;
        }
    });
    
    // Обработчик FAB кнопки
    window.addEventListener('showAddFood', () => {
        // TODO: Показать экран добавления продукта
        console.log('[APP] Show add food screen');
    });
}

// Запускаем приложение после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Экспортируем для глобального доступа
window.appContext = appContext;
window.storage = storage;
window.initApp = initApp;

