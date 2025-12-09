/**
 * Главный файл приложения Klyro
 * Новая модульная архитектура с сохранением всех старых данных
 */

// Убеждаемся, что все глобальные переменные доступны
if (typeof appContext === 'undefined') {
    console.error('[APP] appContext не загружен!');
}

if (typeof storage === 'undefined') {
    console.error('[APP] storage не загружен!');
}

if (typeof Helpers === 'undefined') {
    console.error('[APP] Helpers не загружен!');
}

if (typeof Calculations === 'undefined') {
    console.error('[APP] Calculations не загружен!');
}

// Инициализация приложения
async function initApp() {
    console.log('[APP] Начало инициализации...');
    
    try {
        // Проверяем наличие всех зависимостей
        if (typeof appContext === 'undefined') {
            throw new Error('appContext не загружен');
        }
        if (typeof storage === 'undefined') {
            throw new Error('storage не загружен');
        }
        
        // Инициализируем контекст приложения
        console.log('[APP] Инициализация appContext...');
        await appContext.init();
        console.log('[APP] appContext инициализирован');
        
        // КРИТИЧНО: Проверяем наличие профиля ПЕРЕД показом экранов
        const hasProfile = appContext.hasCompleteProfile();
        
        console.log('[APP] Profile check:', {
            hasProfile,
            userData: appContext.getUserData(),
            hasDate: !!(appContext.getUserData()?.dateOfBirth || appContext.getUserData()?.age),
            hasHeight: !!appContext.getUserData()?.height
        });
        
        // Скрываем все старые экраны
        hideAllScreens();
        
        // Ждем немного, чтобы все компоненты загрузились
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (hasProfile) {
            // Профиль есть - показываем главный экран
            console.log('[APP] Показываем Dashboard');
            if (typeof dashboardScreen !== 'undefined') {
                dashboardScreen.show();
            } else {
                console.error('[APP] dashboardScreen не загружен!');
                showOnboardingScreen();
            }
        } else {
            // Профиля нет - показываем форму онбординга
            console.log('[APP] Показываем Onboarding');
            showOnboardingScreen();
        }
        
        // Настраиваем навигацию
        setupNavigation();
        
        // Загружаем продукты в фоне
        appContext.loadProducts().catch(e => {
            console.error('[APP] Ошибка загрузки продуктов:', e);
        });
        
        console.log('[APP] Инициализация завершена');
        
    } catch (e) {
        console.error('[APP] Initialization error:', e);
        console.error('[APP] Stack:', e.stack);
        
        // Показываем уведомление если возможно
        if (typeof Helpers !== 'undefined' && Helpers.showNotification) {
            Helpers.showNotification('Ошибка при запуске приложения', 'error');
        } else {
            alert('Ошибка при запуске приложения: ' + e.message);
        }
        
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

// Показать экран онбординга
function showOnboardingScreen() {
    if (typeof onboardingScreen !== 'undefined') {
        onboardingScreen.show();
    } else {
        // Fallback если компонент еще не загружен
        const screen = document.getElementById('onboarding-screen');
        if (screen) {
            screen.classList.add('active');
            screen.style.display = 'block';
        } else {
            console.error('[APP] Экран онбординга не найден!');
        }
    }
}

// Настройка навигации
function setupNavigation() {
    window.addEventListener('navChange', (e) => {
        const tab = e.detail.tab;
        console.log('[APP] Переключение на таб:', tab);
        hideAllScreens();
        
        switch(tab) {
            case 'home':
                if (typeof dashboardScreen !== 'undefined') {
                    dashboardScreen.show();
                }
                break;
            case 'diary':
                if (typeof diaryScreen !== 'undefined') {
                    diaryScreen.show();
                }
                break;
            case 'products':
                // Показываем экран добавления продукта
                if (typeof addFoodScreen !== 'undefined') {
                    addFoodScreen.show();
                }
                break;
            case 'activity':
                if (typeof activityScreen !== 'undefined') {
                    activityScreen.show();
                }
                break;
            case 'profile':
                if (typeof profileScreen !== 'undefined') {
                    profileScreen.show();
                }
                break;
        }
    });
    
    // Обработчик FAB кнопки (из навигации)
    window.addEventListener('showAddFood', () => {
        console.log('[APP] Показываем AddFood screen');
        if (typeof addFoodScreen !== 'undefined') {
            addFoodScreen.show();
        }
    });
}

// Запускаем приложение после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[APP] DOM загружен, запускаем initApp');
        initApp();
    });
} else {
    console.log('[APP] DOM уже загружен, запускаем initApp');
    initApp();
}

// Экспортируем для глобального доступа
window.appContext = appContext;
window.storage = storage;
window.initApp = initApp;
window.hideAllScreens = hideAllScreens;
window.showOnboardingScreen = showOnboardingScreen;

console.log('[APP] app.js загружен');
