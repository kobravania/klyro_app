/**
 * KLYRO - Главный файл приложения
 * Полностью переписанный frontend в стиле Apple
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
        console.log('[APP] Telegram WebApp инициализирован');
    } else {
        console.warn('[APP] Telegram WebApp API не найден');
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

function showOpenViaBotScreen() {
    hideAllScreens();
    // IMPORTANT: Activation screen must be static: hide app navigation/FAB and stop.
    if (window.navigation && typeof window.navigation.hide === 'function') {
        try { window.navigation.hide(); } catch (e) {}
    }
    try {
        const nav = document.getElementById('bottom-nav');
        if (nav) nav.style.display = 'none';
    } catch (e) {}
    try {
        const fab = document.getElementById('fab-add-food');
        if (fab) fab.classList.add('hidden');
    } catch (e) {}
    const app = document.getElementById('app');
    if (!app) return;

    const existing = document.getElementById('open-via-bot-screen');
    if (existing) existing.remove();

    const botUsername = (window.KLYRO_BOT_USERNAME || 'klyro_nutrition_bot').trim();
    const deepLink = `https://t.me/${botUsername}?start=webapp`;

    const screen = document.createElement('div');
    screen.id = 'open-via-bot-screen';
    screen.className = 'screen active';
    screen.style.display = 'flex';
    screen.style.flexDirection = 'column';
    screen.innerHTML = `
        <div class="screen-content">
            <h1 class="screen-title">Откройте через бота</h1>
            <p style="color: var(--text-secondary); margin-bottom: var(--spacing-xl);">
                Откройте приложение через бота, чтобы продолжить
            </p>
            <button class="btn btn-primary btn-block" id="open-via-bot-btn" style="display:flex; align-items:center; justify-content:center;">
                Открыть через Telegram
            </button>
        </div>
    `;
    app.appendChild(screen);

    const btn = document.getElementById('open-via-bot-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            try {
                window.open(deepLink, '_blank');
            } catch (e) {}
        });
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ============================================

async function initApp() {
    console.log('[APP] Инициализация приложения...');
    
    showLoadingScreen();

    // Явные состояния приложения
    let appState = 'loading'; // loading -> (200 dashboard | 404 onboarding | 401 activation | 500 error)
    
    try {
        // Инициализируем Telegram WebApp
        initTelegramWebApp();

        // Загружаем локальные данные (без профиля)
        await appContext.loadData();

        // ЕДИНСТВЕННАЯ точка решения — ответ backend на GET /api/profile
        try {
            console.log('[APP] GET /api/profile...');
            const profile = await apiClient.getProfile();
            if (profile) {
                appState = 'dashboard';
                await appContext.setUserData(profile);
            } else {
                appState = 'onboarding';
                await appContext.setUserData(null);
            }
        } catch (e) {
            console.log('[APP] loadProfile(): error', e && (e.code || e.message || String(e)));
            appState = (e && e.code === 'AUTH_REQUIRED') ? 'activation' : 'error';
        }

        console.log('[APP] decision:', appState);

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
            showOpenViaBotScreen();
            return;
        }
        showServiceUnavailable();
    } catch (error) {
        hideLoadingScreen();
        showServiceUnavailable();
    }
}

function showTemporaryOnboarding() {
    const app = document.getElementById('app');
    if (!app) return;
    
    const tempScreen = document.createElement('div');
    tempScreen.id = 'temporary-onboarding';
    tempScreen.className = 'screen active';
    tempScreen.style.display = 'flex';
    tempScreen.style.flexDirection = 'column';
    tempScreen.innerHTML = `
        <div class="screen-content">
            <h1 class="screen-title">Добро пожаловать в Klyro</h1>
            <p style="color: var(--text-secondary); margin-bottom: var(--spacing-xl);">
                Для начала работы заполните профиль
            </p>
            <button class="btn btn-primary btn-block" onclick="window.initApp && window.initApp()">
                Начать
            </button>
        </div>
    `;
    app.appendChild(tempScreen);
}

function showErrorScreen(error) {
    const app = document.getElementById('app');
    if (!app) return;
    
    hideAllScreens();
    
    // Безопасное получение сообщения об ошибке
    let errorMessage = 'Произошла ошибка при загрузке приложения';
    if (error) {
        if (typeof error === 'string') {
            errorMessage = error;
        } else if (error.message) {
            errorMessage = String(error.message);
        } else if (error.toString) {
            try {
                errorMessage = String(error.toString());
            } catch (e) {
                errorMessage = 'Неизвестная ошибка';
            }
        }
    }
    
    const errorScreen = document.createElement('div');
    errorScreen.className = 'screen active';
    errorScreen.style.display = 'flex';
    errorScreen.style.flexDirection = 'column';
    errorScreen.innerHTML = `
        <div class="screen-content">
            <h1 class="screen-title">Ошибка</h1>
            <p style="color: var(--text-secondary); margin-bottom: var(--spacing-xl); white-space: pre-wrap; word-break: break-word;">
                ${errorMessage}
            </p>
            <button class="btn btn-primary btn-block" onclick="location.reload()">
                Перезагрузить
            </button>
        </div>
    `;
    app.appendChild(errorScreen);
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

// Показать AddFood
window.addEventListener('showAddFood', () => {
    console.log('[APP] Показываем AddFood');
    if (typeof addFoodScreen !== 'undefined') {
        addFoodScreen.show();
    }
});

// ============================================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ============================================

// Ждем загрузки DOM и всех скриптов
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Даем время на загрузку всех модулей
        setTimeout(initApp, 100);
    });
} else {
    setTimeout(initApp, 100);
}

function showServiceUnavailable() {
    hideAllScreens();
    const unavailableHTML = `
        <div id="service-unavailable-screen" class="screen active" style="display: flex; align-items: center; justify-content: center; padding: var(--spacing-xl); min-height: 100vh;">
            <div class="card" style="text-align: center; max-width: 400px;">
                <div style="font-size: 48px; margin-bottom: var(--spacing-lg);">⚠️</div>
                <h2 class="screen-title" style="margin-bottom: var(--spacing-md);">Сервис временно недоступен</h2>
                <p style="color: var(--text-secondary); margin-bottom: var(--spacing-xl);">
                    Попробуйте позже
                </p>
                <div style="display:flex; gap: var(--spacing-md); justify-content:center; flex-wrap:wrap;">
                    <button class="btn btn-primary" onclick="window.initApp && window.initApp()" style="min-width: 200px;">
                        Повторить
                    </button>
                    <button class="btn btn-secondary" onclick="window.Telegram?.WebApp?.close?.()" style="min-width: 200px;">
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const app = document.getElementById('app');
    if (app) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = unavailableHTML;
        app.appendChild(tempDiv.firstElementChild);
    }
}

// Экспортируем функции
window.hideAllScreens = hideAllScreens;
window.showLoadingScreen = showLoadingScreen;
window.hideLoadingScreen = hideLoadingScreen;
window.showServiceUnavailable = showServiceUnavailable;
window.initApp = initApp;

