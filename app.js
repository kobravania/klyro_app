// Telegram Web App API
const tg = window.Telegram?.WebApp || {
    ready: () => {},
    expand: () => {},
    initDataUnsafe: {},
    showAlert: (message) => alert(message)
};

// Состояние приложения
let currentStep = 1;
const totalSteps = 4;
let userData = null;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    // Инициализация Telegram Web App (если доступно)
    if (window.Telegram?.WebApp) {
        tg.ready();
        tg.expand();
    }
    
    // Показываем экран загрузки на 1.5 секунды
    setTimeout(() => {
        checkUserAuth();
    }, 1500);
});

// Проверка авторизации и загрузка данных
function checkUserAuth() {
    // Проверяем наличие сохранённых данных
    const savedData = localStorage.getItem('klyro_user_data');
    
    if (savedData) {
        userData = JSON.parse(savedData);
        showProfileScreen();
        return;
    }

    // Проверяем Telegram авторизацию
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const telegramUser = tg.initDataUnsafe.user;
        userData = {
            id: telegramUser.id,
            firstName: telegramUser.first_name || 'Пользователь',
            lastName: telegramUser.last_name || '',
            username: telegramUser.username || '',
            photoUrl: telegramUser.photo_url || ''
        };
        showAuthScreen();
    } else {
        // Если нет данных Telegram, показываем экран авторизации
        showAuthScreen();
    }
}

// Показать экран авторизации
function showAuthScreen() {
    hideAllScreens();
    const authScreen = document.getElementById('auth-screen');
    authScreen.classList.add('active');
    
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
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
}

// Экспорт функций для использования в HTML
window.nextStep = nextStep;
window.prevStep = prevStep;
window.completeOnboarding = completeOnboarding;
window.editProfile = editProfile;
window.recalculateCalories = recalculateCalories;

