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
        showAlert: (message) => alert(message)
    };
    console.log('Telegram WebApp API not found, using fallback');
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
    
    // Инициализация Telegram Web App (если доступно)
    if (window.Telegram && window.Telegram.WebApp) {
        try {
            tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();
            console.log('Telegram WebApp initialized');
            console.log('Telegram version:', tg.version);
            console.log('Telegram platform:', tg.platform);
        } catch (e) {
            console.log('Telegram WebApp init error:', e);
        }
    } else {
        console.log('Telegram WebApp API not found - running in browser');
    }
    
    // В Telegram показываем экран быстрее
    const delay = (window.Telegram && window.Telegram.WebApp) ? 500 : 1000;
    
    // Принудительно показываем auth screen
    setTimeout(() => {
        console.log('Timeout - showing auth screen');
        forceShowAuth();
        
        // Проверяем, что экран действительно показался
        setTimeout(() => {
            const authScreen = document.getElementById('auth-screen');
            if (authScreen && authScreen.classList.contains('active')) {
                console.log('✅ Auth screen is active');
            } else {
                console.error('❌ Auth screen is NOT active, trying again...');
                forceShowAuth();
            }
        }, 100);
        
        // Затем проверяем данные
        setTimeout(() => {
            try {
                checkUserAuth();
            } catch (e) {
                console.error('Error in checkUserAuth:', e);
                // В случае ошибки показываем auth screen
                forceShowAuth();
            }
        }, 300);
    }, delay);
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

// Аварийный fallback - через 2 секунды принудительно показываем auth
setTimeout(() => {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen && loadingScreen.classList.contains('active')) {
        console.warn('EMERGENCY: Loading screen still active after 2s, forcing auth');
        forceShowAuth();
    }
}, 2000);

// Проверка авторизации и загрузка данных
function checkUserAuth() {
    try {
        // Проверяем наличие сохранённых данных
        const savedData = localStorage.getItem('klyro_user_data');
        
        if (savedData) {
            try {
                userData = JSON.parse(savedData);
                // Проверяем, что данные валидны
                if (userData && (userData.age || userData.firstName)) {
                    showProfileScreen();
                    return;
                }
            } catch (e) {
                console.error('Error parsing saved data:', e);
                localStorage.removeItem('klyro_user_data');
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
        
        if (userData.photoUrl) {
            document.getElementById('user-avatar').src = userData.photoUrl;
        }
        
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
function saveUserData() {
    if (userData) {
        localStorage.setItem('klyro_user_data', JSON.stringify(userData));
    }
}

// Загрузка данных пользователя
function loadUserData() {
    const savedData = localStorage.getItem('klyro_user_data');
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

// Экспорт функций для использования в HTML
window.nextStep = nextStep;
window.prevStep = prevStep;
window.completeOnboarding = completeOnboarding;
window.editProfile = editProfile;
window.recalculateCalories = recalculateCalories;

