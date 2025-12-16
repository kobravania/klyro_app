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
        await appContext.loadData();
        
        // Проверяем наличие профиля
        const hasProfile = appContext.hasCompleteProfile();
        const userData = appContext.getUserData();
        
        console.log('[APP] Профиль загружен:', hasProfile);
        console.log('[APP] UserData:', userData);
        console.log('[APP] Проверка полей:', {
            hasDate: !!(userData?.dateOfBirth || userData?.age),
            hasHeight: !!(userData?.height && userData.height > 0),
            dateOfBirth: userData?.dateOfBirth,
            age: userData?.age,
            height: userData?.height,
            weight: userData?.weight,
            gender: userData?.gender
        });
        
        // Скрываем экран загрузки
        hideLoadingScreen();
        
        if (hasProfile) {
            // Профиль есть - показываем Dashboard
            console.log('[APP] Показываем Dashboard');
            navigation.show();
            dashboardScreen.show();
            navigation.switchTab('home');
        } else {
            // Профиля нет - показываем онбординг
            console.log('[APP] Показываем онбординг');
            navigation.hide();
            if (typeof onboardingScreen !== 'undefined') {
                onboardingScreen.show();
            } else {
                // Если онбординг не загружен, показываем временный экран
                showTemporaryOnboarding();
            }
        }
    } catch (error) {
        console.error('[APP] Ошибка инициализации:', error);
        hideLoadingScreen();
        showErrorScreen(error);
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

// Экспортируем функции
window.hideAllScreens = hideAllScreens;
window.showLoadingScreen = showLoadingScreen;
window.hideLoadingScreen = hideLoadingScreen;
window.initApp = initApp;

