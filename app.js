// Telegram Web App API
let tg;
if (window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    console.log('Telegram WebApp API found');
} else {
    tg = {
        ready: () => {},
        expand: () => {},
        initDataUnsafe: {},
        showAlert: (message) => alert(message),
        CloudStorage: null
    };
    console.log('Telegram WebApp API not found, using fallback');
}

// ============================================
// ОБЕРТКА ДЛЯ ХРАНЕНИЯ ДАННЫХ (CloudStorage + localStorage fallback)
// ============================================

// Асинхронное сохранение данных с синхронизацией между устройствами
async function saveToStorage(key, value) {
    try {
        // Пробуем использовать Telegram Cloud Storage (синхронизируется между устройствами)
        if (tg && tg.CloudStorage) {
            await tg.CloudStorage.setItem(key, value);
            console.log(`[STORAGE] Saved to CloudStorage: ${key}`);
            // Также сохраняем в localStorage как резервную копию
            try {
                localStorage.setItem(key, value);
            } catch (e) {
                console.warn('[STORAGE] localStorage backup failed:', e);
            }
            return true;
        } else {
            // Fallback на localStorage если CloudStorage недоступен
            localStorage.setItem(key, value);
            console.log(`[STORAGE] Saved to localStorage: ${key}`);
            return true;
        }
    } catch (error) {
        console.error(`[STORAGE] Error saving ${key}:`, error);
        // Fallback на localStorage при ошибке
        try {
            localStorage.setItem(key, value);
            console.log(`[STORAGE] Fallback to localStorage: ${key}`);
            return true;
        } catch (e) {
            console.error(`[STORAGE] localStorage fallback failed:`, e);
            return false;
        }
    }
}

// Асинхронная загрузка данных
async function loadFromStorage(key) {
    try {
        // Пробуем загрузить из Telegram Cloud Storage
        if (tg && tg.CloudStorage) {
            const value = await tg.CloudStorage.getItem(key);
            if (value !== null && value !== undefined) {
                console.log(`[STORAGE] Loaded from CloudStorage: ${key}`);
                // Обновляем localStorage для быстрого доступа
                try {
                    localStorage.setItem(key, value);
                } catch (e) {
                    console.warn('[STORAGE] localStorage sync failed:', e);
                }
                return value;
            }
        }
        
        // Fallback на localStorage
        const value = localStorage.getItem(key);
        if (value !== null) {
            console.log(`[STORAGE] Loaded from localStorage: ${key}`);
            // Если CloudStorage доступен, синхронизируем данные
            if (tg && tg.CloudStorage) {
                try {
                    await tg.CloudStorage.setItem(key, value);
                    console.log(`[STORAGE] Synced to CloudStorage: ${key}`);
                } catch (e) {
                    console.warn('[STORAGE] CloudStorage sync failed:', e);
                }
            }
            return value;
        }
        
        return null;
    } catch (error) {
        console.error(`[STORAGE] Error loading ${key}:`, error);
        // Fallback на localStorage
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.error(`[STORAGE] localStorage fallback failed:`, e);
            return null;
        }
    }
}

// Синхронная версия для обратной совместимости (использует localStorage как кэш)
function loadFromStorageSync(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        console.error(`[STORAGE] Sync load failed:`, e);
        return null;
    }
}

// Периодическая синхронизация данных из CloudStorage
function startDataSync() {
    if (!tg || !tg.CloudStorage) return;
    
    // Синхронизация каждые 30 секунд
    setInterval(async () => {
        try {
            console.log('[SYNC] Starting data sync...');
            
            // Синхронизируем дневник
            const diaryStr = await loadFromStorage('klyro_diary');
            if (diaryStr) {
                localStorage.setItem('klyro_diary', diaryStr);
                // Обновляем отображение если нужно
                if (document.getElementById('diary-screen')?.classList.contains('active')) {
                    const today = new Date().toISOString().split('T')[0];
                    renderDiary(today);
                }
                if (typeof updateDashboard === 'function') {
                    updateDashboard();
                }
            }
            
            // Синхронизируем данные пользователя
            const userDataStr = await loadFromStorage('klyro_user_data');
            if (userDataStr) {
                const cloudUserData = JSON.parse(userDataStr);
                // Обновляем только если данные новее
                if (userData && cloudUserData) {
                    const localTime = userData.lastSync || 0;
                    const cloudTime = cloudUserData.lastSync || 0;
                    if (cloudTime > localTime) {
                        userData = cloudUserData;
                        localStorage.setItem('klyro_user_data', userDataStr);
                        if (typeof updateDashboard === 'function') {
                            updateDashboard();
                        }
                    }
                }
            }
            
            console.log('[SYNC] Data sync completed');
        } catch (e) {
            console.error('[SYNC] Sync error:', e);
        }
    }, 30000); // 30 секунд
    
    // Также синхронизируем при фокусе окна
    window.addEventListener('focus', async () => {
        console.log('[SYNC] Window focused, syncing data...');
        await loadDiaryFromCloud();
    });
}

// Состояние приложения
let currentStep = 1;
const totalSteps = 4;
let userData = null;

// Простая функция для скрытия loading и показа auth
function forceShowAuth() {
    console.log('Force showing auth screen');
    try {
        // Скрываем все экраны
        const allScreens = document.querySelectorAll('.screen');
        allScreens.forEach(screen => {
            screen.classList.remove('active');
            screen.style.display = 'none';
        });
        
        // Показываем auth screen
        const authScreen = document.getElementById('auth-screen');
        if (authScreen) {
            authScreen.classList.add('active');
            authScreen.style.display = 'block';
            console.log('Auth screen should be visible now');
        } else {
            console.error('Auth screen element not found!');
        }
    } catch (e) {
        console.error('Error in forceShowAuth:', e);
    }
}

// Функция для отправки логов на сервер (для отладки)
function sendLogToServer(level, message) {
    try {
        // Отправляем только важные логи
        if (level === 'error' || message.includes('ERROR') || message.includes('❌')) {
            fetch('https://9d8bc4492f90.ngrok-free.app/log', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    level,
                    message,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString(),
                    telegram: window.Telegram && window.Telegram.WebApp ? 'yes' : 'no'
                })
            }).catch(() => {}); // Игнорируем ошибки отправки
        }
    } catch (e) {
        // Игнорируем ошибки
    }
}

// Перехватываем console.error для отправки на сервер
const originalError = console.error;
console.error = function(...args) {
    originalError.apply(console, args);
    sendLogToServer('error', args.join(' '));
};

// Инициализация приложения - упрощённая версия
function initApp() {
    console.log('=== Klyro App Initializing ===');
    console.log('User Agent:', navigator.userAgent);
    console.log('Is Telegram:', window.Telegram && window.Telegram.WebApp ? 'Yes' : 'No');
    
    // Скрываем все экраны сразу, чтобы не было мелькания
    hideAllScreens();
    
    // Инициализация Telegram Web App (если доступно)
    if (window.Telegram && window.Telegram.WebApp) {
        try {
            tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();
            console.log('Telegram WebApp initialized');
            console.log('Telegram version:', tg.version);
            console.log('Telegram platform:', tg.platform);
            
            // Запускаем периодическую синхронизацию данных из CloudStorage
            if (tg.CloudStorage) {
                console.log('[STORAGE] CloudStorage available, starting sync');
                startDataSync();
            } else {
                console.warn('[STORAGE] CloudStorage not available');
            }
        } catch (e) {
            console.log('Telegram WebApp init error:', e);
        }
    } else {
        console.log('Telegram WebApp API not found - running in browser');
    }
    
    // Сразу проверяем данные пользователя СИНХРОННО (без задержки)
    // Это предотвращает мелькание экрана авторизации
    try {
        checkUserAuth();
    } catch (e) {
        console.error('Error in checkUserAuth:', e);
        // В случае ошибки показываем auth screen
        showAuthScreen();
    }
}

// Функция для запуска инициализации
function startApp() {
    console.log('Starting app initialization...');
    console.log('DOM state:', document.readyState);
    console.log('Telegram API available:', window.Telegram && window.Telegram.WebApp ? 'Yes' : 'No');
    
    // Ждём готовности DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOMContentLoaded fired');
            // Небольшая задержка для Telegram API
            setTimeout(initApp, 200);
        });
    } else {
        console.log('DOM already loaded');
        // Для Telegram даём больше времени на загрузку API
        const delay = (window.Telegram && window.Telegram.WebApp) ? 100 : 200;
        setTimeout(initApp, delay);
    }
}

// Запускаем инициализацию
startApp();

// Проверка авторизации и загрузка данных
async function checkUserAuth() {
    try {
        // Сначала скрываем все экраны, чтобы не было мелькания
        hideAllScreens();
        
        // Проверяем наличие сохранённых данных (сначала из localStorage для быстрой загрузки)
        let savedData = loadFromStorageSync('klyro_user_data');
        
        // Затем загружаем из CloudStorage для синхронизации
        if (tg && tg.CloudStorage) {
            try {
                const cloudData = await loadFromStorage('klyro_user_data');
                if (cloudData) {
                    savedData = cloudData;
                }
            } catch (e) {
                console.warn('[AUTH] CloudStorage load failed, using localStorage:', e);
            }
        }
        
        if (savedData) {
            try {
                userData = JSON.parse(savedData);
                // Проверяем, что данные валидны (есть хотя бы возраст или имя)
                if (userData && (userData.age || userData.firstName)) {
                    // Сразу показываем профиль, без задержек
                    showProfileScreen();
                    // Обновляем username
                    updateUsernameDisplay();
                    // Загружаем дневник из CloudStorage
                    loadDiaryFromCloud();
                    return;
                }
            } catch (e) {
                console.error('Error parsing saved data:', e);
                await saveToStorage('klyro_user_data', '');
            }
        }

        // Проверяем Telegram авторизацию
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
            const initData = window.Telegram.WebApp.initDataUnsafe;
            console.log('Telegram initData:', initData);
            
            if (initData.user) {
                const telegramUser = initData.user;
                console.log('Telegram user found:', telegramUser);
                userData = {
                    id: telegramUser.id,
                    firstName: telegramUser.first_name || 'Пользователь',
                    lastName: telegramUser.last_name || '',
                    username: telegramUser.username || '',
                    photoUrl: telegramUser.photo_url || ''
                };
                // Обновляем username
                updateUsernameDisplay();
                // Если есть данные профиля, показываем профиль, иначе онбординг
                if (userData.age || userData.height) {
                    showProfileScreen();
                } else {
                    showOnboardingScreen();
                }
                return;
            } else {
                console.log('Telegram user not found in initData');
            }
        } else {
            console.log('Telegram WebApp or initDataUnsafe not available');
        }
        
        // Если нет данных Telegram, показываем экран авторизации
        console.log('No saved data or Telegram user, showing auth screen');
        showAuthScreen();
    } catch (e) {
        console.error('Error in checkUserAuth:', e);
        showAuthScreen();
    }
}

// Показать экран авторизации
function showAuthScreen() {
    console.log('showAuthScreen() called');
    try {
        // Скрываем все экраны явно
        const allScreens = document.querySelectorAll('.screen');
        console.log('Hiding', allScreens.length, 'screens');
        allScreens.forEach(screen => {
            screen.classList.remove('active');
            screen.style.display = 'none';
        });
        
        // Показываем auth screen
        const authScreen = document.getElementById('auth-screen');
        if (authScreen) {
            authScreen.classList.add('active');
            authScreen.style.display = 'block';
            console.log('✅ Auth screen activated and visible');
        } else {
            console.error('❌ Auth screen element not found!');
            forceShowAuth();
            return;
        }
    } catch (e) {
        console.error('Error in showAuthScreen:', e);
        forceShowAuth();
        return;
    }
    
    const authButton = document.getElementById('auth-button');
    authButton.addEventListener('click', () => {
        // В реальном приложении здесь должна быть проверка через Telegram
        // Для демо используем данные из initDataUnsafe или создаём тестовые
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            const telegramUser = tg.initDataUnsafe.user;
            userData = {
                id: telegramUser.id,
                firstName: telegramUser.first_name || 'Пользователь',
                lastName: telegramUser.last_name || '',
                username: telegramUser.username || '',
                photoUrl: telegramUser.photo_url || ''
            };
            // Обновляем username
            updateUsernameDisplay();
        } else {
            // Тестовые данные для разработки
            userData = {
                id: Date.now(),
                firstName: 'Тестовый',
                lastName: 'Пользователь',
                username: 'test_user',
                photoUrl: ''
            };
        }
        showOnboardingScreen();
    });
}

// Показать экран онбординга
function showOnboardingScreen() {
    hideAllScreens();
    const onboardingScreen = document.getElementById('onboarding-screen');
    onboardingScreen.classList.add('active');
    currentStep = 1;
    updateProgress();
    showStep(1);
}

// Показать экран профиля
function showProfileScreen() {
    hideAllScreens();
    const profileScreen = document.getElementById('profile-screen');
    profileScreen.classList.add('active');
    
    if (userData) {
        // Заполняем данные профиля
        document.getElementById('user-name').textContent = 
            `${userData.firstName} ${userData.lastName || ''}`.trim();
        
        // Обновляем username в углу
        updateUsernameDisplay();
        
        // Показываем параметры
        if (userData.age) {
            document.getElementById('profile-age').textContent = userData.age;
        }
        
        if (userData.gender) {
            const genderText = userData.gender === 'male' ? 'Мужской' : 'Женский';
            document.getElementById('profile-gender').textContent = genderText;
        }
        
        if (userData.height) {
            document.getElementById('profile-height').textContent = `${userData.height} см`;
        }
        
        if (userData.weight) {
            document.getElementById('profile-weight').textContent = `${userData.weight} кг`;
        }
        
        if (userData.activity) {
            const activityMap = {
                'low': 'Низкий',
                'moderate': 'Средний',
                'high': 'Высокий'
            };
            document.getElementById('profile-activity').textContent = activityMap[userData.activity] || userData.activity;
        }
        
        if (userData.goal) {
            const goalMap = {
                'lose': 'Снижение веса',
                'maintain': 'Поддержание веса',
                'gain': 'Набор массы'
            };
            document.getElementById('profile-goal').textContent = goalMap[userData.goal] || userData.goal;
        }
        
        // Показываем калории
        const calories = calculateCalories();
        document.getElementById('calories-value').textContent = Math.round(calories);
    }
}

// Управление шагами онбординга
function showStep(step) {
    const steps = document.querySelectorAll('.onboarding-step');
    steps.forEach(s => s.classList.remove('active'));
    
    const currentStepElement = document.querySelector(`[data-step="${step}"]`);
    if (currentStepElement) {
        currentStepElement.classList.add('active');
    }
    
    updateProgress();
}

function nextStep() {
    // Валидация текущего шага
    if (!validateCurrentStep()) {
        return;
    }
    
    if (currentStep < totalSteps) {
        currentStep++;
        showStep(currentStep);
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
}

function updateProgress() {
    const progress = (currentStep / totalSteps) * 100;
    document.getElementById('progress-fill').style.width = `${progress}%`;
}

function validateCurrentStep() {
    switch (currentStep) {
        case 1:
            const age = document.getElementById('age').value;
            const gender = document.querySelector('input[name="gender"]:checked');
            if (!age || age < 10 || age > 120) {
                showNotification('Пожалуйста, введите корректный возраст (10-120 лет)');
                return false;
            }
            if (!gender) {
                showNotification('Пожалуйста, выберите пол');
                return false;
            }
            return true;
        
        case 2:
            const height = document.getElementById('height').value;
            const weight = document.getElementById('weight').value;
            if (!height || height < 100 || height > 250) {
                showNotification('Пожалуйста, введите корректный рост (100-250 см)');
                return false;
            }
            if (!weight || weight < 30 || weight > 300) {
                showNotification('Пожалуйста, введите корректный вес (30-300 кг)');
                return false;
            }
            return true;
        
        case 3:
            const activity = document.querySelector('input[name="activity"]:checked');
            if (!activity) {
                showNotification('Пожалуйста, выберите уровень активности');
                return false;
            }
            return true;
        
        case 4:
            const goal = document.querySelector('input[name="goal"]:checked');
            if (!goal) {
                showNotification('Пожалуйста, выберите цель');
                return false;
            }
            return true;
        
        default:
            return true;
    }
}

// Показать уведомление
function showNotification(message) {
    if (window.Telegram?.WebApp) {
        tg.showAlert(message);
    } else {
        alert(message);
    }
}

// Завершение онбординга
function completeOnboarding() {
    if (!validateCurrentStep()) {
        return;
    }
    
    // Собираем все данные
    const ageInput = document.getElementById('age');
    const genderInput = document.querySelector('input[name="gender"]:checked');
    const heightInput = document.getElementById('height');
    const weightInput = document.getElementById('weight');
    const activityInput = document.querySelector('input[name="activity"]:checked');
    const goalInput = document.querySelector('input[name="goal"]:checked');
    
    if (!userData) {
        userData = {};
    }
    
    if (ageInput) userData.age = parseInt(ageInput.value);
    if (genderInput) userData.gender = genderInput.value;
    if (heightInput) userData.height = parseInt(heightInput.value);
    if (weightInput) userData.weight = parseFloat(weightInput.value);
    if (activityInput) userData.activity = activityInput.value;
    if (goalInput) userData.goal = goalInput.value;
    
    // Рассчитываем калории
    userData.calories = calculateCalories();
    
    // Сохраняем данные
    saveUserData();
    
    // Показываем профиль
    showProfileScreen();
}

// Расчёт калорий по формуле Mifflin-St Jeor
function calculateCalories() {
    if (!userData || !userData.age || !userData.gender || !userData.height || !userData.weight) {
        return 0;
    }
    
    // BMR (Basal Metabolic Rate) по формуле Mifflin-St Jeor
    let bmr;
    if (userData.gender === 'male') {
        bmr = 10 * userData.weight + 6.25 * userData.height - 5 * userData.age + 5;
    } else {
        bmr = 10 * userData.weight + 6.25 * userData.height - 5 * userData.age - 161;
    }
    
    // Коэффициент активности
    const activityMultipliers = {
        'low': 1.2,
        'moderate': 1.55,
        'high': 1.9
    };
    
    const activityMultiplier = activityMultipliers[userData.activity] || 1.2;
    let tdee = bmr * activityMultiplier;
    
    // Корректировка в зависимости от цели
    const goalAdjustments = {
        'lose': 0.85,      // Дефицит 15%
        'maintain': 1.0,   // Без изменений
        'gain': 1.15       // Профицит 15%
    };
    
    const goalAdjustment = goalAdjustments[userData.goal] || 1.0;
    const finalCalories = tdee * goalAdjustment;
    
    return finalCalories;
}

// Сохранение данных пользователя
async function saveUserData() {
    if (userData) {
        await saveToStorage('klyro_user_data', JSON.stringify(userData));
    }
}

// Загрузка данных пользователя
async function loadUserData() {
    const savedData = await loadFromStorage('klyro_user_data');
    if (savedData) {
        userData = JSON.parse(savedData);
        return true;
    }
    return false;
}

// Редактирование профиля
function editProfile() {
    // Заполняем форму текущими данными
    if (userData.age) {
        document.getElementById('age').value = userData.age;
    }
    if (userData.gender) {
        const genderInput = document.querySelector(`input[name="gender"][value="${userData.gender}"]`);
        if (genderInput) {
            genderInput.checked = true;
        }
    }
    if (userData.height) {
        document.getElementById('height').value = userData.height;
    }
    if (userData.weight) {
        document.getElementById('weight').value = userData.weight;
    }
    if (userData.activity) {
        const activityInput = document.querySelector(`input[name="activity"][value="${userData.activity}"]`);
        if (activityInput) {
            activityInput.checked = true;
        }
    }
    if (userData.goal) {
        const goalInput = document.querySelector(`input[name="goal"][value="${userData.goal}"]`);
        if (goalInput) {
            goalInput.checked = true;
        }
    }
    
    // Начинаем с первого шага для редактирования
    currentStep = 1;
    showOnboardingScreen();
}

// Пересчёт калорий
function recalculateCalories() {
    if (!userData) {
        showNotification('Сначала заполните данные профиля');
        return;
    }
    
    const newCalories = calculateCalories();
    userData.calories = newCalories;
    saveUserData();
    
    document.getElementById('calories-value').textContent = Math.round(newCalories);
    
    // Показываем уведомление
    showNotification('Калории пересчитаны!');
}

// Скрыть все экраны
function hideAllScreens() {
    try {
        const screens = document.querySelectorAll('.screen');
        console.log('Hiding', screens.length, 'screens');
        screens.forEach(screen => {
            screen.classList.remove('active');
            screen.style.display = 'none';
        });
        // Убеждаемся, что loading screen скрыт
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.remove('active');
            loadingScreen.style.display = 'none';
        }
    } catch (e) {
        console.error('Error hiding screens:', e);
    }
}

// ============================================
// НОВЫЕ МОДУЛИ: Трекер питания и активности
// ============================================

// Глобальные переменные для новых модулей
let productsDatabase = [];
let selectedProduct = null;
let macrosChart = null;
let caloriesChart = null;
let weightChart = null;
let currentDiaryDate = new Date().toISOString().split('T')[0];
let currentHistoryPeriod = 7;

// Загрузка базы продуктов
async function loadProductsDatabase() {
    try {
        const response = await fetch('data/products.json');
        productsDatabase = await response.json();
        console.log(`Загружено ${productsDatabase.length} продуктов`);
    } catch (e) {
        console.error('Ошибка загрузки продуктов:', e);
        productsDatabase = [];
    }
}

// Инициализация новых модулей при загрузке
if (typeof window !== 'undefined') {
    loadProductsDatabase();
}

// ============================================
// РАСШИРЕНИЕ DASHBOARD (профиля)
// ============================================

// Обновление Dashboard с данными за сегодня
function updateDashboard() {
    if (!userData) {
        console.log('[DASHBOARD] No userData, skipping');
        return;
    }
    
    // Проверяем наличие элементов
    const consumedEl = document.getElementById('consumed-calories');
    const targetEl = document.getElementById('target-calories');
    const progressEl = document.getElementById('calories-progress-fill');
    const dateEl = document.getElementById('today-date');
    const chartEl = document.getElementById('macros-chart');
    
    if (!consumedEl || !targetEl || !progressEl) {
        console.error('[DASHBOARD] Required elements not found!', {
            consumed: !!consumedEl,
            target: !!targetEl,
            progress: !!progressEl
        });
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    const diary = getDiaryForDate(today);
    const totalKcal = diary.reduce((sum, item) => sum + item.kcal, 0);
    const totalProtein = diary.reduce((sum, item) => sum + item.protein, 0);
    const totalFat = diary.reduce((sum, item) => sum + item.fat, 0);
    const totalCarbs = diary.reduce((sum, item) => sum + item.carbs, 0);
    
    const targetCalories = calculateCalories();
    
    // Обновляем калории сегодня
    consumedEl.textContent = Math.round(totalKcal);
    targetEl.textContent = Math.round(targetCalories);
    
    // Прогресс-бар калорий
    const progress = targetCalories > 0 ? Math.min((totalKcal / targetCalories) * 100, 100) : 0;
    progressEl.style.width = `${progress}%`;
    
    // Обновляем дату
    if (dateEl) {
        const date = new Date();
        dateEl.textContent = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    }
    
    // Обновляем макросы только если canvas существует
    if (chartEl) {
        updateMacrosChart(totalProtein, totalFat, totalCarbs);
    } else {
        console.warn('[DASHBOARD] Macros chart canvas not found');
    }
}

// Обновление графика макросов (donut chart)
function updateMacrosChart(protein, fat, carbs) {
    const ctx = document.getElementById('macros-chart');
    if (!ctx) return;
    
    // Удаляем старый график если есть
    if (macrosChart) {
        macrosChart.destroy();
    }
    
    const total = protein + fat + carbs;
    const proteinPercent = total > 0 ? (protein / total * 100).toFixed(1) : 0;
    const fatPercent = total > 0 ? (fat / total * 100).toFixed(1) : 0;
    const carbsPercent = total > 0 ? (carbs / total * 100).toFixed(1) : 0;
    
    macrosChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Белки', 'Жиры', 'Углеводы'],
            datasets: [{
                data: [protein, fat, carbs],
                backgroundColor: ['#5DADE2', '#F39C12', '#82E0AA'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const percent = context.parsed / (protein + fat + carbs) * 100;
                            return `${label}: ${value.toFixed(1)}г (${percent.toFixed(1)}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // Обновляем значения в легенде
    document.getElementById('protein-value').textContent = `${protein.toFixed(1)}г`;
    document.getElementById('fat-value').textContent = `${fat.toFixed(1)}г`;
    document.getElementById('carbs-value').textContent = `${carbs.toFixed(1)}г`;
}

// Сохраняем оригинальную функцию showProfileScreen
const originalShowProfileScreen = showProfileScreen;

// Переопределяем showProfileScreen для обновления Dashboard
function showProfileScreenExtended() {
    originalShowProfileScreen();
    // Увеличиваем задержку для гарантии загрузки DOM
    setTimeout(() => {
        console.log('[DASHBOARD] Updating dashboard...');
        try {
            updateDashboard();
            console.log('[DASHBOARD] Dashboard updated successfully');
        } catch (e) {
            console.error('[DASHBOARD] Error updating dashboard:', e);
        }
    }, 300);
}

// Заменяем функцию
showProfileScreen = showProfileScreenExtended;

// ============================================
// ЭКРАН ДОБАВЛЕНИЯ ЕДЫ
// ============================================

function showAddFoodScreen() {
    hideAllScreens();
    const screen = document.getElementById('add-food-screen');
    screen.classList.add('active');
    document.getElementById('food-search').value = '';
    document.getElementById('food-search').focus();
    renderProductsList(productsDatabase);
}

function searchProducts(query) {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) {
        renderProductsList(productsDatabase);
        document.getElementById('add-custom-product').style.display = 'none';
        return;
    }
    
    const filtered = productsDatabase.filter(product => 
        product.name.toLowerCase().includes(searchTerm)
    );
    
    renderProductsList(filtered);
    document.getElementById('add-custom-product').style.display = filtered.length === 0 ? 'block' : 'none';
}

function renderProductsList(products) {
    const list = document.getElementById('products-list');
    if (!list) return;
    
    if (products.length === 0) {
        list.innerHTML = '<div class="empty-state">Продукты не найдены</div>';
        return;
    }
    
    list.innerHTML = products.slice(0, 50).map(product => `
        <div class="product-card" onclick="selectProduct(${product.id})">
            <div class="product-name">${product.name}</div>
            <div class="product-macros">
                <span>${product.kcal} ккал</span>
                <span>Б: ${product.protein}г</span>
                <span>Ж: ${product.fat}г</span>
                <span>У: ${product.carbs}г</span>
            </div>
        </div>
    `).join('');
}

function selectProduct(productId) {
    selectedProduct = productsDatabase.find(p => p.id === String(productId));
    if (!selectedProduct) return;
    
    showProductAmountScreen();
}

function showProductAmountScreen() {
    if (!selectedProduct) return;
    
    hideAllScreens();
    const screen = document.getElementById('product-amount-screen');
    screen.classList.add('active');
    
    document.getElementById('selected-product-name').textContent = selectedProduct.name;
    document.getElementById('product-grams').value = 100;
    updateProductPreview();
}

function updateProductPreview() {
    if (!selectedProduct) return;
    
    const grams = parseFloat(document.getElementById('product-grams').value) || 100;
    const multiplier = grams / 100;
    
    const kcal = selectedProduct.kcal * multiplier;
    const protein = selectedProduct.protein * multiplier;
    const fat = selectedProduct.fat * multiplier;
    const carbs = selectedProduct.carbs * multiplier;
    
    document.getElementById('preview-kcal').textContent = `${kcal.toFixed(1)} ккал`;
    document.getElementById('preview-protein').textContent = `${protein.toFixed(1)}г белка`;
    document.getElementById('preview-fat').textContent = `${fat.toFixed(1)}г жиров`;
    document.getElementById('preview-carbs').textContent = `${carbs.toFixed(1)}г углеводов`;
}

function setQuickAmount(grams) {
    document.getElementById('product-grams').value = grams;
    updateProductPreview();
}

function addFoodToDiary() {
    if (!selectedProduct) return;
    
    const grams = parseFloat(document.getElementById('product-grams').value) || 100;
    const multiplier = grams / 100;
    
    const entry = {
        id: Date.now().toString(),
        name: selectedProduct.name,
        grams: grams,
        kcal: selectedProduct.kcal * multiplier,
        protein: selectedProduct.protein * multiplier,
        fat: selectedProduct.fat * multiplier,
        carbs: selectedProduct.carbs * multiplier,
        timestamp: new Date().toISOString()
    };
    
    addDiaryEntry(currentDiaryDate, entry);
    showNotification('Продукт добавлен в дневник!');
    showDiaryScreen();
}

function showCustomProductForm() {
    hideAllScreens();
    document.getElementById('custom-product-screen').classList.add('active');
}

function saveCustomProduct() {
    const name = document.getElementById('custom-name').value.trim();
    const kcal = parseFloat(document.getElementById('custom-kcal').value) || 0;
    const protein = parseFloat(document.getElementById('custom-protein').value) || 0;
    const fat = parseFloat(document.getElementById('custom-fat').value) || 0;
    const carbs = parseFloat(document.getElementById('custom-carbs').value) || 0;
    
    if (!name) {
        showNotification('Введите название продукта');
        return;
    }
    
    const newProduct = {
        id: `custom_${Date.now()}`,
        name: name,
        kcal: kcal,
        protein: protein,
        fat: fat,
        carbs: carbs
    };
    
    productsDatabase.push(newProduct);
    selectedProduct = newProduct;
    showProductAmountScreen();
}

// ============================================
// ДНЕВНИК ПИТАНИЯ
// ============================================

// Загрузка дневника из CloudStorage
async function loadDiaryFromCloud() {
    try {
        if (tg && tg.CloudStorage) {
            const diaryStr = await loadFromStorage('klyro_diary');
            if (diaryStr) {
                const diary = JSON.parse(diaryStr);
                // Обновляем локальный кэш
                localStorage.setItem('klyro_diary', diaryStr);
                // Обновляем отображение если на экране дневника
                if (document.getElementById('diary-screen')?.classList.contains('active')) {
                    const today = new Date().toISOString().split('T')[0];
                    renderDiary(today);
                }
                // Обновляем dashboard
                if (typeof updateDashboard === 'function') {
                    updateDashboard();
                }
            }
        }
    } catch (e) {
        console.error('[DIARY] Error loading from cloud:', e);
    }
}

function getDiary() {
    const diaryStr = loadFromStorageSync('klyro_diary');
    return diaryStr ? JSON.parse(diaryStr) : {};
}

async function saveDiary(diary) {
    const diaryStr = JSON.stringify(diary);
    // Сохраняем в CloudStorage для синхронизации
    await saveToStorage('klyro_diary', diaryStr);
    // Также сохраняем в localStorage для быстрого доступа
    localStorage.setItem('klyro_diary', diaryStr);
}

function getDiaryForDate(date) {
    const diary = getDiary();
    return diary[date] || [];
}

function addDiaryEntry(date, entry) {
    const diary = getDiary();
    if (!diary[date]) {
        diary[date] = [];
    }
    diary[date].push(entry);
    saveDiary(diary);
}

function removeDiaryEntry(date, entryId) {
    const diary = getDiary();
    if (diary[date]) {
        diary[date] = diary[date].filter(item => item.id !== entryId);
        saveDiary(diary);
    }
}

function showDiaryScreen() {
    hideAllScreens();
    const screen = document.getElementById('diary-screen');
    screen.classList.add('active');
    renderDiary();
}

function renderDiary() {
    const date = currentDiaryDate;
    const entries = getDiaryForDate(date);
    
    // Обновляем дату
    const dateObj = new Date(date);
    document.getElementById('diary-date').textContent = dateObj.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'long',
        weekday: 'long'
    });
    
    // Подсчитываем итоги
    const totalKcal = entries.reduce((sum, item) => sum + item.kcal, 0);
    const totalProtein = entries.reduce((sum, item) => sum + item.protein, 0);
    const totalFat = entries.reduce((sum, item) => sum + item.fat, 0);
    const totalCarbs = entries.reduce((sum, item) => sum + item.carbs, 0);
    
    document.getElementById('diary-total-kcal').textContent = Math.round(totalKcal);
    document.getElementById('diary-total-protein').textContent = `${totalProtein.toFixed(1)}г`;
    document.getElementById('diary-total-fat').textContent = `${totalFat.toFixed(1)}г`;
    document.getElementById('diary-total-carbs').textContent = `${totalCarbs.toFixed(1)}г`;
    
    // Рендерим приёмы пищи
    const mealsContainer = document.getElementById('diary-meals');
    if (entries.length === 0) {
        mealsContainer.innerHTML = '<div class="empty-state">Нет записей за этот день</div>';
        return;
    }
    
    // Группируем по времени (можно улучшить)
    mealsContainer.innerHTML = entries.map(entry => {
        const time = new Date(entry.timestamp).toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        return `
            <div class="diary-entry">
                <div class="entry-header">
                    <div class="entry-name">${entry.name}</div>
                    <button class="btn-delete" onclick="deleteDiaryEntry('${entry.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
                <div class="entry-details">
                    <span class="entry-time">${time}</span>
                    <span class="entry-grams">${entry.grams}г</span>
                </div>
                <div class="entry-macros">
                    <span>${Math.round(entry.kcal)} ккал</span>
                    <span>Б: ${entry.protein.toFixed(1)}г</span>
                    <span>Ж: ${entry.fat.toFixed(1)}г</span>
                    <span>У: ${entry.carbs.toFixed(1)}г</span>
                </div>
            </div>
        `;
    }).join('');
}

function changeDiaryDate(days) {
    const date = new Date(currentDiaryDate);
    date.setDate(date.getDate() + days);
    currentDiaryDate = date.toISOString().split('T')[0];
    renderDiary();
}

function deleteDiaryEntry(entryId) {
    if (confirm('Удалить эту запись?')) {
        removeDiaryEntry(currentDiaryDate, entryId);
        renderDiary();
        updateDashboard();
    }
}

// ============================================
// ИСТОРИЯ И ГРАФИКИ
// ============================================

function showHistoryScreen() {
    hideAllScreens();
    const screen = document.getElementById('history-screen');
    screen.classList.add('active');
    setTimeout(() => {
        renderHistoryCharts();
    }, 100);
}

function setHistoryPeriod(days) {
    currentHistoryPeriod = days;
    document.querySelectorAll('.btn-period').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderHistoryCharts();
}

function renderHistoryCharts() {
    const diary = getDiary();
    const dates = [];
    const calories = [];
    const weights = [];
    
    for (let i = currentHistoryPeriod - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dates.push(date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
        
        const entries = diary[dateStr] || [];
        const totalKcal = entries.reduce((sum, item) => sum + item.kcal, 0);
        calories.push(Math.round(totalKcal));
        
        // Вес можно добавить позже в userData
        weights.push(null);
    }
    
    // График калорий
    const caloriesCtx = document.getElementById('calories-chart');
    if (caloriesCtx) {
        if (caloriesChart) caloriesChart.destroy();
        caloriesChart = new Chart(caloriesCtx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Калории',
                    data: calories,
                    borderColor: '#5DADE2',
                    backgroundColor: 'rgba(93, 173, 226, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // График веса (если есть данные)
    const weightCtx = document.getElementById('weight-chart');
    if (weightCtx && weights.some(w => w !== null)) {
        if (weightChart) weightChart.destroy();
        weightChart = new Chart(weightCtx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Вес (кг)',
                    data: weights,
                    borderColor: '#82E0AA',
                    backgroundColor: 'rgba(130, 224, 170, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}

// ============================================
// ТРЕНИРОВКИ И АКТИВНОСТЬ
// ============================================

const activityMET = {
    'running': 11.5,
    'running-fast': 16,
    'walking': 3.5,
    'cycling': 8,
    'swimming': 8,
    'gym': 5,
    'yoga': 3,
    'pilates': 3,
    'dancing': 6,
    'basketball': 8,
    'football': 7,
    'tennis': 7
};

function showActivityScreen() {
    hideAllScreens();
    const screen = document.getElementById('activity-screen');
    screen.classList.add('active');
    renderActivities();
}

function renderActivities() {
    const activities = getActivities();
    const container = document.getElementById('activity-list');
    
    if (activities.length === 0) {
        container.innerHTML = '<div class="empty-state">Нет записей о тренировках</div>';
        return;
    }
    
    container.innerHTML = activities.map(activity => {
        const date = new Date(activity.timestamp).toLocaleDateString('ru-RU');
        return `
            <div class="activity-card">
                <div class="activity-name">${activity.name}</div>
                <div class="activity-details">
                    <span>${date}</span>
                    <span>${activity.duration} мин</span>
                    <span>${activity.calories} ккал</span>
                </div>
            </div>
        `;
    }).join('');
}

function getActivities() {
    const activitiesStr = localStorage.getItem('klyro_activities');
    return activitiesStr ? JSON.parse(activitiesStr) : [];
}

function saveActivity() {
    const name = document.getElementById('activity-name').value;
    const duration = parseFloat(document.getElementById('activity-duration').value) || 0;
    const addToDiary = document.getElementById('add-to-diary').checked;
    
    if (!name || !duration) {
        showNotification('Заполните все поля');
        return;
    }
    
    const met = activityMET[name] || 5;
    const weight = userData?.weight || 70;
    const calories = Math.round(met * weight * (duration / 60));
    
    const activity = {
        id: Date.now().toString(),
        name: document.querySelector(`#activity-name option[value="${name}"]`).textContent,
        duration: duration,
        calories: calories,
        timestamp: new Date().toISOString()
    };
    
    const activities = getActivities();
    activities.push(activity);
    saveActivities(activities);
    
    if (addToDiary) {
        // Добавляем как отрицательные калории (можно улучшить)
        const entry = {
            id: `activity_${activity.id}`,
            name: `Тренировка: ${activity.name}`,
            grams: 0,
            kcal: -calories,
            protein: 0,
            fat: 0,
            carbs: 0,
            timestamp: activity.timestamp
        };
        addDiaryEntry(currentDiaryDate, entry);
    }
    
    showNotification('Тренировка сохранена!');
    showActivityScreen();
}

function showAddActivityForm() {
    hideAllScreens();
    document.getElementById('add-activity-screen').classList.add('active');
    document.getElementById('activity-duration').value = 30;
    updateActivityCalories();
}

function updateActivityCalories() {
    const name = document.getElementById('activity-name').value;
    const duration = parseFloat(document.getElementById('activity-duration').value) || 0;
    
    if (!name || !duration) {
        document.getElementById('activity-calories').textContent = '0';
        return;
    }
    
    const met = activityMET[name] || 5;
    const weight = userData?.weight || 70;
    const calories = Math.round(met * weight * (duration / 60));
    document.getElementById('activity-calories').textContent = calories;
}

// Экспорт функций для использования в HTML
window.nextStep = nextStep;
window.prevStep = prevStep;
window.completeOnboarding = completeOnboarding;
window.editProfile = editProfile;
window.recalculateCalories = recalculateCalories;

// Новые функции
window.showAddFoodScreen = showAddFoodScreen;
window.showDiaryScreen = showDiaryScreen;
window.showHistoryScreen = showHistoryScreen;
window.showActivityScreen = showActivityScreen;
window.searchProducts = searchProducts;
window.selectProduct = selectProduct;
window.setQuickAmount = setQuickAmount;
window.updateProductPreview = updateProductPreview;
window.addFoodToDiary = addFoodToDiary;
window.showCustomProductForm = showCustomProductForm;
window.saveCustomProduct = saveCustomProduct;
window.changeDiaryDate = changeDiaryDate;
window.deleteDiaryEntry = deleteDiaryEntry;
window.setHistoryPeriod = setHistoryPeriod;
window.showAddActivityForm = showAddActivityForm;
window.updateActivityCalories = updateActivityCalories;
window.saveActivity = saveActivity;
window.showProfileScreen = showProfileScreenExtended;

// ============================================
// НАСТРОЙКИ
// ============================================

function showSettingsScreen() {
    hideAllScreens();
    const screen = document.getElementById('settings-screen');
    screen.classList.add('active');
    
    // Загружаем сохранённые единицы измерения
    const units = loadFromStorageSync('klyro_units') || 'metric';
    const unitInput = document.querySelector(`input[name="units"][value="${units}"]`);
    if (unitInput) unitInput.checked = true;
}

async function setUnits(units) {
    await saveToStorage('klyro_units', units);
    localStorage.setItem('klyro_units', units);
    showNotification('Единицы измерения изменены');
}

function exportData() {
    const diary = getDiary();
    const activities = getActivities();
    const savedUserData = loadFromStorageSync('klyro_user_data');
    const userData = savedUserData ? JSON.parse(savedUserData) : {};
    
    // Создаём CSV для дневника
    let csv = 'Дата,Продукт,Вес (г),Калории,Белки (г),Жиры (г),Углеводы (г),Время\n';
    
    Object.keys(diary).forEach(date => {
        diary[date].forEach(entry => {
            const time = new Date(entry.timestamp).toLocaleTimeString('ru-RU');
            csv += `${date},"${entry.name}",${entry.grams},${entry.kcal.toFixed(1)},${entry.protein.toFixed(1)},${entry.fat.toFixed(1)},${entry.carbs.toFixed(1)},${time}\n`;
        });
    });
    
    // Добавляем тренировки
    csv += '\nТренировки\n';
    csv += 'Дата,Активность,Длительность (мин),Калории\n';
    activities.forEach(activity => {
        const date = new Date(activity.timestamp).toISOString().split('T')[0];
        csv += `${date},"${activity.name}",${activity.duration},${activity.calories}\n`;
    });
    
    // Создаём и скачиваем файл
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `klyro_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Данные экспортированы!');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const lines = text.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                showNotification('Неверный формат файла');
                return;
            }
            
            // Парсим CSV (упрощённая версия)
            const diary = getDiary();
            let imported = 0;
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (line.startsWith('Тренировки') || line.startsWith('Дата,Активность')) break;
                
                const parts = line.split(',');
                if (parts.length >= 6) {
                    const date = parts[0].trim();
                    const name = parts[1].replace(/"/g, '').trim();
                    const grams = parseFloat(parts[2]) || 0;
                    const kcal = parseFloat(parts[3]) || 0;
                    const protein = parseFloat(parts[4]) || 0;
                    const fat = parseFloat(parts[5]) || 0;
                    const carbs = parseFloat(parts[6]) || 0;
                    
                    const entry = {
                        id: `import_${Date.now()}_${i}`,
                        name: name,
                        grams: grams,
                        kcal: kcal,
                        protein: protein,
                        fat: fat,
                        carbs: carbs,
                        timestamp: new Date().toISOString()
                    };
                    
                    if (!diary[date]) diary[date] = [];
                    diary[date].push(entry);
                    imported++;
                }
            }
            
            saveDiary(diary);
            showNotification(`Импортировано ${imported} записей`);
            
            // Очищаем input
            event.target.value = '';
        } catch (error) {
            console.error('Ошибка импорта:', error);
            showNotification('Ошибка при импорте данных');
        }
    };
    reader.readAsText(file);
}

window.showSettingsScreen = showSettingsScreen;
window.setUnits = setUnits;
window.exportData = exportData;
window.importData = importData;

// ============================================
// ФУНКЦИЯ ОТОБРАЖЕНИЯ USERNAME
// ============================================

// Обновление отображения username в углу экрана
function updateUsernameDisplay() {
    if (!userData) {
        const badge = document.getElementById('username-badge');
        if (badge) badge.style.display = 'none';
        return;
    }
    
    const badge = document.getElementById('username-badge');
    if (!badge) return;
    
    // Получаем username из Telegram или используем firstName
    let username = userData.username || userData.firstName || 'Пользователь';
    
    // Если есть @, убираем его
    if (username.startsWith('@')) {
        username = username.substring(1);
    }
    
    // Если нет username, используем firstName
    if (!userData.username && userData.firstName) {
        username = userData.firstName;
    }
    
    badge.textContent = `@${username}`;
    badge.style.display = 'block';
}

// Экспорт функции
window.updateUsernameDisplay = updateUsernameDisplay;

