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

// ============================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ============================================

async function initApp() {
    console.log('[APP] Инициализация приложения...');
    
    showLoadingScreen();
    
    try {
        // Инициализируем Telegram WebApp
        initTelegramWebApp();
        
        // Загружаем данные
        try {
            await appContext.loadData();
        } catch (error) {
            // Сервер недоступен - показываем нейтральный экран
            hideLoadingScreen();
            showServiceUnavailable();
            return;
        }
        
        // Скрываем экран загрузки
        hideLoadingScreen();
        
        // Проверяем наличие профиля (строгая логика: если userData есть - профиль есть)
        if (appContext.hasProfile()) {
            // Профиль есть (200) - показываем Dashboard
            navigation.show();
            dashboardScreen.show();
            navigation.switchTab('home');
        } else {
            // Профиля нет (404) - показываем онбординг
            navigation.hide();
            if (typeof onboardingScreen !== 'undefined') {
                onboardingScreen.show();
            } else {
                showTemporaryOnboarding();
            }
        }
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
            <button class="btn btn-primary btn-block" onclick="location.reload()">
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
                <button class="btn btn-primary" onclick="location.reload()" style="min-width: 200px;">
                    Обновить
                </button>
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

