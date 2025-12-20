/**
 * KLYRO - Главный файл приложения
 * InitData-based architecture: валидация initData, работа без /start
 */

// Telegram Web App API
let tg;
let tgReady = false;

// ============================================
// ИНИЦИАЛИЗАЦИЯ TELEGRAM WEB APP
// ============================================

function initTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        tgReady = true;
    } else {
        tgReady = false;
    }
}

// ============================================
// УПРАВЛЕНИЕ ЭКРАНАМИ
// ============================================

function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
        screen.style.display = 'none';
    });
}

function showLoadingScreen() {
    hideAllScreens();
    const loading = document.getElementById('loading-screen');
    if (loading) {
        loading.classList.add('active');
        loading.style.display = 'flex';
    }
}

function hideLoadingScreen() {
    const loading = document.getElementById('loading-screen');
    if (loading) {
        loading.classList.remove('active');
        loading.style.display = 'none';
    }
}

function showServiceUnavailable() {
    hideAllScreens();
    const app = document.getElementById('app');
    if (!app) return;

    const existing = document.getElementById('service-unavailable-screen');
    if (existing) existing.remove();

    const screen = document.createElement('div');
    screen.id = 'service-unavailable-screen';
    screen.className = 'screen active';
    screen.style.display = 'flex';
    screen.style.flexDirection = 'column';
    screen.innerHTML = `
        <div class="screen-content">
            <h1 class="screen-title">Сервис временно недоступен</h1>
            <p style="color: var(--text-secondary); margin-bottom: var(--spacing-xl);">
                Попробуйте позже
            </p>
            <button class="btn btn-primary btn-block" onclick="window.initApp && window.initApp()">
                Повторить
            </button>
        </div>
    `;
    app.appendChild(screen);
}

function showActivationScreen() {
    hideAllScreens();
    const app = document.getElementById('app');
    if (!app) return;

    // Скрываем навигацию и FAB
    if (typeof navigation !== 'undefined') {
        navigation.hide();
    }
    if (typeof fab !== 'undefined') {
        fab.hide();
    }

    const existing = document.getElementById('activation-screen');
    if (existing) existing.remove();

    const botUsername = window.KLYRO_BOT_USERNAME || 'klyro_nutrition_bot';
    const startLink = `https://t.me/${botUsername}?start=webapp`;

    const screen = document.createElement('div');
    screen.id = 'activation-screen';
    screen.className = 'screen active';
    screen.style.display = 'flex';
    screen.style.flexDirection = 'column';
    screen.innerHTML = `
        <div class="screen-content">
            <h1 class="screen-title">Откройте приложение через бота</h1>
            <p style="color: var(--text-secondary); margin-bottom: var(--spacing-xl);">
                Для работы приложения необходимо открыть его через команду /start в боте
            </p>
            <a href="${startLink}" class="btn btn-primary btn-block" style="text-decoration: none; display: block; text-align: center;">
                Открыть через бота
            </a>
        </div>
    `;
    app.appendChild(screen);
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ============================================

async function initApp() {
    console.log('[APP] Инициализация приложения...');
    
    showLoadingScreen();

    try {
        // Инициализируем Telegram WebApp
        initTelegramWebApp();
        
        // ОБЯЗАТЕЛЬНО: вызываем Telegram.WebApp.ready()
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
        }

        // Загружаем локальные данные (без профиля)
        await appContext.loadData();

        // ЕДИНСТВЕННАЯ ТОЧКА РЕШЕНИЯ: вызываем /api/init
        // Mini App НЕ ИМЕЕТ ПРАВА показывать интерфейс до успешного ответа
        let appState = 'loading';
        let hasProfile = false;
        
        try {
            console.log('[APP] Вызов /api/init...');
            const initData = apiClient.getInitData();
            console.log('[APP] initData длина:', initData ? initData.length : 0);
            
            // ГАРАНТИРОВАННЫЙ ЗАПРОС - отправляется ВСЕГДА
            const initResponse = await fetch('/api/init', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': initData || ''
                }
            });
            
            console.log('[APP] /api/init получил ответ:', initResponse.status, initResponse.statusText);
            
            if (initResponse.status === 401) {
                appState = 'activation';
            } else if (!initResponse.ok) {
                appState = 'error';
            } else {
                const initResult = await initResponse.json();
                hasProfile = initResult.has_profile || false;
                console.log('[APP] /api/init: has_profile =', hasProfile);
                
                if (hasProfile) {
                    // Загружаем полный профиль
                    const profile = await apiClient.getProfile();
                    if (profile) {
                        await appContext.setUserData(profile);
                        appState = 'dashboard';
                    } else {
                        appState = 'onboarding';
                    }
                } else {
                    appState = 'onboarding';
                    await appContext.setUserData(null);
                }
            }
        } catch (e) {
            console.error('[APP] Ошибка при инициализации:', e);
            appState = 'error';
        }

        hideLoadingScreen();

        if (appState === 'dashboard') {
            navigation.show();
            dashboardScreen.show();
            navigation.switchTab('home');
            return;
        }

        if (appState === 'onboarding') {
            navigation.hide();
            onboardingScreen.show();
            return;
        }

        if (appState === 'activation') {
            showActivationScreen();
            return;
        }

        // 500 -> error
        showServiceUnavailable();
    } catch (error) {
        console.error('[APP] Критическая ошибка:', error);
        hideLoadingScreen();
        showServiceUnavailable();
    }
}

// ============================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================

// Навигация
window.addEventListener('navChange', (e) => {
    const tab = e.detail.tab;
    console.log('[APP] Переключение на таб:', tab);
    
    hideAllScreens();
    navigation.hide();
    
    switch(tab) {
        case 'home':
            navigation.show();
            dashboardScreen.show();
            break;
        case 'diary':
            navigation.show();
            diaryScreen.show();
            break;
        case 'activity':
            navigation.show();
            if (typeof activityScreen !== 'undefined') {
                activityScreen.show();
            }
            break;
        case 'profile':
            navigation.show();
            if (typeof profileScreen !== 'undefined') {
                profileScreen.show();
            }
            break;
    }
});

// Добавление еды
window.addEventListener('showAddFood', () => {
    if (typeof addFoodScreen !== 'undefined') {
        addFoodScreen.show();
    }
});

// Инициализация при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Экспортируем для глобального доступа
window.initApp = initApp;
