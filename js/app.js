/**
 * Главный файл приложения Klyro
 * Новая модульная архитектура с сохранением всех старых данных
 * Версия: 3.0 - Apple UI
 */
console.log('[APP] Klyro v3.0 - Apple UI загружается...');

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
        
        // Ждем, чтобы все компоненты точно загрузились
        // Проверяем готовность несколько раз с таймаутами
        let attempts = 0;
        const maxAttempts = 10;
        while (attempts < maxAttempts) {
            const screensReady = typeof dashboardScreen !== 'undefined' && 
                                 typeof onboardingScreen !== 'undefined' &&
                                 typeof navigation !== 'undefined' &&
                                 document.getElementById('dashboard-screen') !== null &&
                                 document.getElementById('onboarding-screen') !== null;
            
            if (screensReady) {
                console.log('[APP] Все компоненты готовы после', attempts, 'попыток');
                break;
            }
            
            attempts++;
            if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        if (attempts >= maxAttempts) {
            console.error('[APP] Не все компоненты загружены после', maxAttempts, 'попыток!');
            console.error('[APP] dashboardScreen:', typeof dashboardScreen);
            console.error('[APP] onboardingScreen:', typeof onboardingScreen);
            console.error('[APP] navigation:', typeof navigation);
            console.error('[APP] dashboard-screen element:', document.getElementById('dashboard-screen'));
            console.error('[APP] onboarding-screen element:', document.getElementById('onboarding-screen'));
            // Все равно пытаемся продолжить
        }
        
        if (hasProfile) {
            // Профиль есть - показываем главный экран
            console.log('[APP] Показываем Dashboard');
            if (typeof dashboardScreen !== 'undefined' && dashboardScreen) {
                // Убеждаемся, что экран создан
                const dashboardEl = document.getElementById('dashboard-screen');
                if (!dashboardEl) {
                    console.warn('[APP] Dashboard screen не найден в DOM, пересоздаем...');
                    dashboardScreen.createHTML();
                }
                dashboardScreen.show();
                // Показываем навигацию
                if (typeof navigation !== 'undefined' && navigation) {
                    // Навигация уже создана в init(), просто активируем таб
                    navigation.switchTab('home');
                }
            } else {
                console.error('[APP] dashboardScreen не загружен!');
                showOnboardingScreen();
            }
        } else {
            // Профиля нет - показываем форму онбординга
            console.log('[APP] Показываем Onboarding - профиль не заполнен');
            showOnboardingScreen();
        }
        
        // Настраиваем навигацию
        setupNavigation();
        
        // Загружаем продукты в фоне
        appContext.loadProducts().catch(e => {
            console.error('[APP] Ошибка загрузки продуктов:', e);
        });
        
        console.log('[APP] Инициализация завершена');

        // Защита от "пустого" экрана: если по какой‑то причине ни один экран не активен,
        // через небольшой таймаут принудительно показываем онбординг или дэшборд.
        setTimeout(() => {
            const activeScreen = document.querySelector('.screen.active');
            if (!activeScreen) {
                console.warn('[APP] Ни один экран не активен, включаем fallback');
                const onboardingEl = document.getElementById('onboarding-screen');
                const dashboardEl = document.getElementById('dashboard-screen');
                
                if (onboardingEl) {
                    onboardingEl.classList.add('active');
                    onboardingEl.style.display = 'block';
                } else if (dashboardEl) {
                    dashboardEl.classList.add('active');
                    dashboardEl.style.display = 'flex';
                    dashboardEl.style.flexDirection = 'column';
                }
            }
        }, 300);
        
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
    // Также скрываем экраны, созданные динамически
    const dynamicScreens = ['dashboard-screen', 'diary-screen', 'add-food-screen', 'activity-screen', 'profile-screen', 'onboarding-screen'];
    dynamicScreens.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('active');
            el.style.display = 'none';
        }
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
                if (typeof dashboardScreen !== 'undefined' && dashboardScreen) {
                    const dashboardEl = document.getElementById('dashboard-screen');
                    if (!dashboardEl) {
                        console.warn('[APP] Dashboard screen not found, recreating...');
                        dashboardScreen.createHTML();
                    }
                    dashboardScreen.show();
                } else {
                    console.error('[APP] dashboardScreen не определен!');
                }
                break;
            case 'diary':
                if (typeof diaryScreen !== 'undefined' && diaryScreen) {
                    const diaryEl = document.getElementById('diary-screen');
                    if (!diaryEl) {
                        console.warn('[APP] Diary screen not found, recreating...');
                        diaryScreen.createHTML();
                    }
                    diaryScreen.show();
                } else {
                    console.error('[APP] diaryScreen не определен!');
                }
                break;
            case 'products':
                // Показываем экран добавления продукта
                if (typeof addFoodScreen !== 'undefined' && addFoodScreen) {
                    addFoodScreen.show();
                } else {
                    console.error('[APP] addFoodScreen не определен!');
                }
                break;
            case 'activity':
                if (typeof activityScreen !== 'undefined' && activityScreen) {
                    const activityEl = document.getElementById('activity-screen');
                    if (!activityEl) {
                        console.warn('[APP] Activity screen not found, recreating...');
                        activityScreen.createHTML();
                    }
                    activityScreen.show();
                } else {
                    console.error('[APP] activityScreen не определен!');
                }
                break;
            case 'profile':
                if (typeof profileScreen !== 'undefined' && profileScreen) {
                    const profileEl = document.getElementById('profile-screen');
                    if (!profileEl) {
                        console.warn('[APP] Profile screen not found, recreating...');
                        profileScreen.createHTML();
                    }
                    profileScreen.show();
                } else {
                    console.error('[APP] profileScreen не определен!');
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

// Запускаем приложение после загрузки ВСЕХ скриптов
// Ждем, чтобы все экраны точно создались
let startAppAttempts = 0;
const MAX_START_ATTEMPTS = 5;

function startApp() {
    // Проверяем, что все необходимые компоненты загружены
    const requiredComponents = [
        'appContext',
        'storage', 
        'dashboardScreen',
        'onboardingScreen',
        'navigation'
    ];
    
    const missing = requiredComponents.filter(name => typeof window[name] === 'undefined');
    
    if (missing.length > 0) {
        console.warn('[APP] Не все компоненты загружены:', missing);
        // Пробуем еще раз через 200ms, максимум 5 раз
        startAppAttempts++;
        if (startAppAttempts < MAX_START_ATTEMPTS) {
            setTimeout(startApp, 200);
            return;
        } else {
            console.error('[APP] Не удалось загрузить все компоненты после', MAX_START_ATTEMPTS, 'попыток, продолжаем с тем что есть');
            // Все равно пытаемся запустить
        }
    }
    
    console.log('[APP] Все компоненты загружены, запускаем initApp');
    // initApp - async функция, но мы не можем использовать await здесь,
    // так как startApp не async. Обрабатываем промис через .catch()
    initApp().catch(e => {
        console.error('[APP] Ошибка при запуске initApp:', e);
        console.error('[APP] Stack:', e.stack);
        // Показываем онбординг в случае ошибки
        const onboardingEl = document.getElementById('onboarding-screen');
        if (onboardingEl) {
            onboardingEl.classList.add('active');
            onboardingEl.style.display = 'block';
        }
    });
}

// Запускаем после полной загрузки страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[APP] DOM загружен, ждем компоненты...');
        setTimeout(startApp, 100);
    });
} else {
    console.log('[APP] DOM уже загружен, ждем компоненты...');
    setTimeout(startApp, 100);
}

// Экспортируем для глобального доступа (только если они уже определены)
if (typeof appContext !== 'undefined') {
    window.appContext = appContext;
}
if (typeof storage !== 'undefined') {
    window.storage = storage;
}
window.initApp = initApp;
window.hideAllScreens = hideAllScreens;
window.showOnboardingScreen = showOnboardingScreen;

console.log('[APP] app.js загружен');
