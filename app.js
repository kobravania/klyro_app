// Telegram Web App API
let tg;
let tgReady = false;

// Инициализация Telegram WebApp
function initTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        // Увеличиваем задержку для полной инициализации CloudStorage в Telegram Web App
        setTimeout(() => {
            // Проверяем, что CloudStorage действительно доступен
            if (tg && tg.CloudStorage && typeof tg.CloudStorage.setItem === 'function') {
                tgReady = true;
            } else {
                // Если CloudStorage недоступен, все равно помечаем как готовый (будет использоваться только localStorage)
                tgReady = true;
            }
        }, 300);
    } else {
        tg = {
            ready: () => {},
            expand: () => {},
            initDataUnsafe: {},
            showAlert: (message) => alert(message),
            CloudStorage: null
        };
        tgReady = true;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTelegramWebApp);
} else {
    initTelegramWebApp();
}

// ============================================
// ХРАНЕНИЕ ДАННЫХ (CloudStorage + localStorage)
// ============================================

async function saveToStorage(key, value) {
    // ВСЕГДА сохраняем в localStorage первым делом
    localStorage.setItem(key, value);
    
    // Затем синхронизируем в CloudStorage в фоне (не блокируем)
    if (tgReady && tg && tg.CloudStorage && typeof tg.CloudStorage.setItem === 'function') {
        // Выполняем асинхронно, не ждем результата
        tg.CloudStorage.setItem(key, value).catch(() => {
            // Игнорируем ошибки - данные уже в localStorage
        });
    }
    
    // Обновляем хэш
    if (key === 'klyro_diary') {
        try {
            const diary = JSON.parse(value);
            lastDiaryHash = getDataHash(diary);
        } catch (e) {
            // Игнорируем ошибку парсинга
        }
    } else if (key === 'klyro_user_data') {
        try {
            const data = JSON.parse(value);
            lastUserDataHash = getDataHash(data);
        } catch (e) {
            // Игнорируем ошибку парсинга
        }
    }
    
    return true;
}

async function loadFromStorage(key) {
    // ВСЕГДА сначала пробуем загрузить из CloudStorage (для синхронизации между устройствами)
    if (tgReady && tg && tg.CloudStorage && typeof tg.CloudStorage.getItem === 'function') {
        try {
            const value = await tg.CloudStorage.getItem(key);
            if (value !== null && value !== undefined && value !== '') {
                // Обновляем localStorage для быстрого доступа
                localStorage.setItem(key, value);
                // Обновляем хэш
                if (key === 'klyro_diary') {
                    try {
                        const diary = JSON.parse(value);
                        lastDiaryHash = getDataHash(diary);
                    } catch (e) {
                        // Игнорируем ошибку парсинга
                    }
                } else if (key === 'klyro_user_data') {
                    try {
                        const data = JSON.parse(value);
                        lastUserDataHash = getDataHash(data);
                    } catch (e) {
                        // Игнорируем ошибку парсинга
                    }
                }
                return value;
            }
        } catch (e) {
            // Fallback to localStorage
        }
    }
    
    // Fallback на localStorage
    const value = localStorage.getItem(key);
    if (value !== null && value !== '') {
        // Синхронизируем в CloudStorage в фоне (если данных нет в CloudStorage)
        if (tgReady && tg && tg.CloudStorage && typeof tg.CloudStorage.setItem === 'function') {
            tg.CloudStorage.setItem(key, value).catch(() => {});
        }
        return value;
    }
    
    return null;
}

function loadFromStorageSync(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        return null;
    }
}

let lastDiaryHash = null;
let lastUserDataHash = null;
let pendingSync = false;

function getDataHash(data) {
    return btoa(JSON.stringify(data)).substring(0, 16);
}

// Функция для синхронизации данных в CloudStorage
async function syncToCloud() {
    if (!tgReady || !tg || !tg.CloudStorage || pendingSync) return;
    
    try {
        pendingSync = true;
        
        // Синхронизируем дневник
        const currentDiary = getDiary();
        const currentDiaryHash = getDataHash(currentDiary);
        if (currentDiaryHash !== lastDiaryHash) {
            await saveToStorage('klyro_diary', JSON.stringify(currentDiary));
            lastDiaryHash = currentDiaryHash;
        }
        
        // Синхронизируем данные пользователя
        if (userData) {
            const currentUserDataHash = getDataHash(userData);
            if (currentUserDataHash !== lastUserDataHash) {
                await saveToStorage('klyro_user_data', JSON.stringify(userData));
                lastUserDataHash = currentUserDataHash;
            }
        }
        
        pendingSync = false;
    } catch (e) {
        console.error('[SYNC] Error:', e);
        pendingSync = false;
    }
}

// Функция для загрузки данных из CloudStorage
async function syncFromCloud() {
    if (!tgReady || !tg || !tg.CloudStorage) return;
    
    try {
        // Загружаем дневник
        const cloudDiaryStr = await loadFromStorage('klyro_diary');
        if (cloudDiaryStr) {
            const cloudDiary = JSON.parse(cloudDiaryStr);
            const cloudDiaryHash = getDataHash(cloudDiary);
            if (cloudDiaryHash !== lastDiaryHash) {
                localStorage.setItem('klyro_diary', cloudDiaryStr);
                lastDiaryHash = cloudDiaryHash;
                
                // Обновляем отображение если нужно
                if (document.getElementById('diary-screen')?.classList.contains('active')) {
                    renderDiary();
                }
                if (typeof updateDashboard === 'function') {
                    updateDashboard();
                }
            }
        }
        
        // Загружаем данные пользователя
        const cloudUserDataStr = await loadFromStorage('klyro_user_data');
        if (cloudUserDataStr) {
            const cloudUserData = JSON.parse(cloudUserDataStr);
            const cloudUserDataHash = getDataHash(cloudUserData);
            if (cloudUserDataHash !== lastUserDataHash) {
                userData = cloudUserData;
                localStorage.setItem('klyro_user_data', cloudUserDataStr);
                lastUserDataHash = cloudUserDataHash;
                
                // Обновляем отображение если нужно
                if (document.getElementById('profile-screen')?.classList.contains('active')) {
                    showProfileScreen();
                }
                if (typeof updateUsernameDisplay === 'function') {
                    updateUsernameDisplay();
                }
            }
        }
    } catch (e) {
        console.error('[SYNC] Load error:', e);
    }
}

function startDataSync() {
    if (!tgReady || !tg || !tg.CloudStorage) return;
    
    // Инициализируем хэши
    const currentDiary = getDiary();
    lastDiaryHash = getDataHash(currentDiary);
    if (userData) {
        lastUserDataHash = getDataHash(userData);
    }
    
    // Сначала загружаем данные из CloudStorage при старте
    syncFromCloud();
    
    // Периодическая синхронизация: отправка изменений каждые 5 секунд (быстрее для лучшей синхронизации)
    setInterval(() => {
        syncToCloud();
    }, 5000);
    
    // Периодическая загрузка изменений каждые 5 секунд (чаще проверяем обновления)
    setInterval(() => {
        syncFromCloud();
    }, 5000);
    
    // Синхронизация при фокусе окна
    window.addEventListener('focus', async () => {
        await syncFromCloud();
    });
    
    // Синхронизация при видимости страницы
    document.addEventListener('visibilitychange', async () => {
        if (!document.hidden) {
            await syncFromCloud();
        }
    });
}

let currentStep = 1;
const totalSteps = 4;
let userData = null;

// Инициализация приложения
function initApp() {
    try {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            screen.classList.remove('active');
            screen.style.display = 'none';
            screen.style.visibility = 'hidden';
            screen.style.opacity = '0';
        });
        
        if (window.Telegram && window.Telegram.WebApp) {
            const screen = document.getElementById('onboarding-screen');
            if (screen) {
                screen.classList.add('active');
                screen.style.display = 'block';
                screen.style.visibility = 'visible';
                screen.style.opacity = '1';
            }
        } else {
            const screen = document.getElementById('auth-screen');
            if (screen) {
                screen.classList.add('active');
                screen.style.display = 'block';
                screen.style.visibility = 'visible';
                screen.style.opacity = '1';
            }
        }
        
        if (tg && tgReady && tg.CloudStorage) {
            startDataSync();
        }
        
        checkUserAuth().catch(e => {
            console.error('[INIT] Error:', e);
        });
    } catch (e) {
        console.error('[INIT] Critical error:', e);
        const screen = document.getElementById('auth-screen') || document.getElementById('onboarding-screen');
        if (screen) {
            screen.style.display = 'block';
            screen.style.visibility = 'visible';
            screen.style.opacity = '1';
        }
    }
}

function startApp() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
}

if (document.readyState === 'complete') {
    startApp();
} else {
    window.addEventListener('load', startApp);
}

async function checkUserAuth() {
    try {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
            loadingScreen.style.visibility = 'hidden';
            loadingScreen.style.opacity = '0';
        }
        
        // ВСЕГДА сначала пробуем загрузить из CloudStorage (для синхронизации между устройствами)
        let savedData = null;
        if (tgReady && tg && tg.CloudStorage) {
            try {
                const cloudPromise = loadFromStorage('klyro_user_data');
                const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 5000));
                savedData = await Promise.race([cloudPromise, timeoutPromise]);
                if (savedData) {
                    localStorage.setItem('klyro_user_data', savedData);
                }
            } catch (e) {
                // Fallback to localStorage
            }
        }
        
        // Fallback на localStorage если CloudStorage не дал результатов
        if (!savedData) {
            savedData = loadFromStorageSync('klyro_user_data');
        }
        
        if (savedData) {
            try {
                userData = JSON.parse(savedData);
                const hasDateOfBirth = !!(userData.dateOfBirth || userData.age);
                const hasHeight = !!userData.height;
                const hasProfileData = hasDateOfBirth && hasHeight;
                
                if (!hasProfileData) {
                    if (window.Telegram && window.Telegram.WebApp) {
                        showOnboardingScreen();
                    } else {
                        showAuthScreen();
                    }
                    return;
                }
                
                if (hasProfileData) {
                    lastUserDataHash = getDataHash(userData);
                    if (typeof getDiary === 'function') {
                        const diary = getDiary();
                        if (diary && Object.keys(diary).length > 0) {
                            lastDiaryHash = getDataHash(diary);
                        }
                    }
                    showProfileScreen();
                    if (typeof updateUsernameDisplay === 'function') {
                        updateUsernameDisplay();
                    }
                    if (typeof loadDiaryFromCloud === 'function') {
                        loadDiaryFromCloud();
                    }
                    return;
                }
            } catch (e) {
                console.error('[AUTH] Parse error:', e);
                localStorage.removeItem('klyro_user_data');
            }
        }

        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
            const initData = window.Telegram.WebApp.initDataUnsafe;
            if (initData.user) {
                if (!userData) userData = {};
                const telegramUser = initData.user;
                userData.id = telegramUser.id;
                userData.firstName = telegramUser.first_name || userData.firstName || 'Пользователь';
                userData.lastName = telegramUser.last_name || userData.lastName || '';
                userData.username = telegramUser.username || userData.username || '';
                userData.photoUrl = telegramUser.photo_url || userData.photoUrl || '';
                
                if (typeof updateUsernameDisplay === 'function') {
                    updateUsernameDisplay();
                }
                
                const hasExistingProfile = userData && (userData.dateOfBirth || userData.age) && userData.height;
                if (hasExistingProfile) {
                    lastUserDataHash = getDataHash(userData);
                    await saveUserData();
                    showProfileScreen();
                    if (typeof loadDiaryFromCloud === 'function') {
                        loadDiaryFromCloud();
                    }
                    return;
                }
            }
        }
        
        if (window.Telegram && window.Telegram.WebApp) {
            showOnboardingScreen();
        } else {
            showAuthScreen();
        }
    } catch (e) {
        console.error('[AUTH] Error:', e);
        if (window.Telegram && window.Telegram.WebApp) {
            showOnboardingScreen();
        } else {
            showAuthScreen();
        }
    }
}

function showAuthScreen() {
    hideAllScreens();
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) {
        authScreen.classList.add('active');
        authScreen.style.display = 'block';
        authScreen.style.visibility = 'visible';
        authScreen.style.opacity = '1';
    }
    
    const authButton = document.getElementById('auth-button');
    if (authButton) {
        const newAuthButton = authButton.cloneNode(true);
        authButton.parentNode.replaceChild(newAuthButton, authButton);
        
        newAuthButton.addEventListener('click', () => {
            if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                const telegramUser = tg.initDataUnsafe.user;
                userData = {
                    id: telegramUser.id,
                    firstName: telegramUser.first_name || 'Пользователь',
                    lastName: telegramUser.last_name || '',
                    username: telegramUser.username || '',
                    photoUrl: telegramUser.photo_url || ''
                };
                updateUsernameDisplay();
            } else {
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
}

function initDateInput() {
    const dateInput = document.getElementById('dateOfBirth');
    const datePicker = document.getElementById('datePicker');
    const datePickerDays = document.getElementById('datePickerDays');
    const datePickerMonth = document.getElementById('datePickerMonth');
    const datePickerYear = document.getElementById('datePickerYear');
    const dateOfBirthValue = document.getElementById('dateOfBirthValue');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const resetBtn = document.getElementById('datePickerReset');
    const confirmBtn = document.getElementById('datePickerConfirm');
    
    if (!dateInput || !datePicker) return;
    
    const today = new Date();
    const maxYear = today.getFullYear() - 10;
    const minYear = 1904;
    
    let currentDate = new Date();
    let selectedDate = null;
    
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    
    monthNames.forEach((name, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = name;
        datePickerMonth.appendChild(option);
    });
    
    for (let year = maxYear; year >= minYear; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        datePickerYear.appendChild(option);
    }
    
    if (userData && userData.dateOfBirth) {
        selectedDate = new Date(userData.dateOfBirth);
        currentDate = new Date(selectedDate);
        updateDateInput();
    } else if (userData && userData.age) {
        const birthYear = today.getFullYear() - userData.age;
        selectedDate = new Date(birthYear, 0, 1);
        currentDate = new Date(selectedDate);
        updateDateInput();
    } else {
        currentDate = new Date(maxYear, 0, 1);
    }
    
    function updateCalendar() {
        datePickerMonth.value = currentDate.getMonth();
        datePickerYear.value = currentDate.getFullYear();
        
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = (firstDay.getDay() + 6) % 7;
        
        datePickerDays.innerHTML = '';
        
        for (let i = 0; i < startingDayOfWeek; i++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'date-picker-day date-picker-day-other';
            datePickerDays.appendChild(dayCell);
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'date-picker-day';
            dayCell.textContent = day;
            
            const cellDate = new Date(year, month, day);
            if (selectedDate && 
                cellDate.getDate() === selectedDate.getDate() &&
                cellDate.getMonth() === selectedDate.getMonth() &&
                cellDate.getFullYear() === selectedDate.getFullYear()) {
                dayCell.classList.add('date-picker-day-selected');
            }
            
            if (cellDate.toDateString() === today.toDateString()) {
                dayCell.classList.add('date-picker-day-today');
            }
            
            dayCell.addEventListener('click', () => {
                selectedDate = new Date(year, month, day);
                updateCalendar();
                updateDateInput();
            });
            
            datePickerDays.appendChild(dayCell);
        }
    }
    
    function updateDateInput() {
        if (selectedDate) {
            const day = selectedDate.getDate();
            const month = selectedDate.getMonth() + 1;
            const year = selectedDate.getFullYear();
            const dateString = `${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}.${year}`;
            const isoDate = selectedDate.toISOString().split('T')[0];
            
            dateInput.value = dateString;
            if (dateOfBirthValue) {
                dateOfBirthValue.value = isoDate;
            }
        } else {
            if (dateInput) dateInput.value = '';
            if (dateOfBirthValue) dateOfBirthValue.value = '';
        }
    }
    
    datePickerMonth.addEventListener('change', () => {
        currentDate.setMonth(parseInt(datePickerMonth.value));
        updateCalendar();
    });
    
    datePickerYear.addEventListener('change', () => {
        currentDate.setFullYear(parseInt(datePickerYear.value));
        updateCalendar();
    });
    
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar();
    });
    
    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar();
    });
    
    resetBtn.addEventListener('click', () => {
        selectedDate = null;
        dateInput.value = '';
        if (dateOfBirthValue) dateOfBirthValue.value = '';
        updateCalendar();
    });
    
    confirmBtn.addEventListener('click', () => {
        datePicker.style.display = 'none';
    });
    
    dateInput.addEventListener('click', (e) => {
        e.preventDefault();
        if (datePicker.style.display === 'none') {
            datePicker.style.display = 'block';
            updateCalendar();
        } else {
            datePicker.style.display = 'none';
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!datePicker.contains(e.target) && e.target !== dateInput) {
            datePicker.style.display = 'none';
        }
    });
    
    updateCalendar();
    if (selectedDate) {
        updateDateInput();
    }
}

function initHeightWeightSliders() {
    const heightSlider = document.getElementById('height');
    const weightSlider = document.getElementById('weight');
    const heightValue = document.getElementById('heightValue');
    const weightValue = document.getElementById('weightValue');
    
    if (userData && userData.height) {
        if (heightSlider) heightSlider.value = userData.height;
        if (heightValue) heightValue.textContent = userData.height + ' см';
    }
    
    if (userData && userData.weight) {
        if (weightSlider) weightSlider.value = userData.weight;
        if (weightValue) weightValue.textContent = userData.weight.toFixed(1) + ' кг';
    }
    
    if (heightSlider && heightValue) {
        heightSlider.addEventListener('input', function() {
            heightValue.textContent = this.value + ' см';
        });
    }
    
    if (weightSlider && weightValue) {
        weightSlider.addEventListener('input', function() {
            weightValue.textContent = parseFloat(this.value).toFixed(1) + ' кг';
        });
    }
}

function showOnboardingScreen() {
    hideAllScreens();
    const onboardingScreen = document.getElementById('onboarding-screen');
    if (onboardingScreen) {
        onboardingScreen.classList.add('active');
        onboardingScreen.style.display = 'block';
        onboardingScreen.style.visibility = 'visible';
        onboardingScreen.style.opacity = '1';
        currentStep = 1;
        updateProgress();
        showStep(1);
        initDateInput();
        initHeightWeightSliders();
    }
}

function showProfileScreen() {
    hideAllScreens();
    const profileScreen = document.getElementById('profile-screen');
    if (profileScreen) {
        profileScreen.classList.add('active');
        profileScreen.style.display = 'block';
        profileScreen.style.visibility = 'visible';
        profileScreen.style.opacity = '1';
    }
    
    // Синхронизируем данные пользователя из CloudStorage перед показом
    if (tgReady && tg && tg.CloudStorage) {
        syncFromCloud().then(() => {
            renderProfileScreen();
        }).catch(() => {
            renderProfileScreen();
        });
    } else {
        renderProfileScreen();
    }
}

function renderProfileScreen() {
    if (userData) {
        document.getElementById('user-name').textContent = 
            `${userData.firstName} ${userData.lastName || ''}`.trim();
        
        updateUsernameDisplay();
        
        const age = getUserAge();
        if (age !== null) {
            document.getElementById('profile-age').textContent = age;
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
        
        const calories = calculateCalories();
        document.getElementById('calories-value').textContent = Math.round(calories);
    }
    
    // Обновляем username
    if (typeof updateUsernameDisplay === 'function') {
        updateUsernameDisplay();
    }
}

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

function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function getUserAge() {
    if (userData && userData.dateOfBirth) {
        return calculateAge(userData.dateOfBirth);
    }
    if (userData && userData.age) {
        return userData.age;
    }
    return null;
}

function validateCurrentStep() {
    switch (currentStep) {
        case 1:
            const dateOfBirthValue = document.getElementById('dateOfBirthValue');
            const dateOfBirth = dateOfBirthValue ? dateOfBirthValue.value : null;
            const gender = document.querySelector('input[name="gender"]:checked');
            
            if (!dateOfBirth || dateOfBirth === '') {
                showNotification('Пожалуйста, выберите дату рождения');
                return false;
            }
            
            const age = calculateAge(dateOfBirth);
            if (age === null || age < 10 || age > 120) {
                showNotification('Пожалуйста, выберите корректную дату рождения (возраст должен быть от 10 до 120 лет)');
                return false;
            }
            
            if (!gender) {
                showNotification('Пожалуйста, выберите пол');
                return false;
            }
            return true;
        
        case 2:
            const heightSlider = document.getElementById('height');
            const weightSlider = document.getElementById('weight');
            const height = heightSlider ? parseInt(heightSlider.value) : 0;
            const weight = weightSlider ? parseFloat(weightSlider.value) : 0;
            if (!height || height < 120 || height > 220) {
                showNotification('Пожалуйста, выберите корректный рост (120-220 см)');
                return false;
            }
            if (!weight || weight < 40 || weight > 200) {
                showNotification('Пожалуйста, выберите корректный вес (40-200 кг)');
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

function showNotification(message) {
    if (window.Telegram?.WebApp) {
        tg.showAlert(message);
    } else {
        alert(message);
    }
}

async function completeOnboarding() {
    if (!validateCurrentStep()) {
        return;
    }
    
    const genderInput = document.querySelector('input[name="gender"]:checked');
    const heightSlider = document.getElementById('height');
    const weightSlider = document.getElementById('weight');
    const activityInput = document.querySelector('input[name="activity"]:checked');
    const goalInput = document.querySelector('input[name="goal"]:checked');
    
    if (!userData) {
        userData = {};
    }
    
    const dateOfBirthValue = document.getElementById('dateOfBirthValue');
    const dateInput = document.getElementById('dateOfBirth');
    
    if (dateOfBirthValue && dateOfBirthValue.value) {
        userData.dateOfBirth = dateOfBirthValue.value;
        userData.age = calculateAge(dateOfBirthValue.value);
    } else if (dateInput && dateInput.value) {
        const dateMatch = dateInput.value.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (dateMatch) {
            const day = parseInt(dateMatch[1]);
            const month = parseInt(dateMatch[2]) - 1;
            const year = parseInt(dateMatch[3]);
            const date = new Date(year, month, day);
            if (!isNaN(date.getTime())) {
                userData.dateOfBirth = date.toISOString().split('T')[0];
                userData.age = calculateAge(userData.dateOfBirth);
            }
        }
    }
    
    if (genderInput) userData.gender = genderInput.value;
    if (heightSlider) userData.height = parseInt(heightSlider.value);
    if (weightSlider) userData.weight = parseFloat(weightSlider.value);
    if (activityInput) userData.activity = activityInput.value;
    if (goalInput) userData.goal = goalInput.value;
    
    userData.calories = calculateCalories();
    
    await saveUserData();
    showProfileScreen();
}

function calculateCalories() {
    const age = getUserAge();
    if (!userData || age === null || !userData.gender || !userData.height || !userData.weight) {
        return 0;
    }
    
    let bmr;
    if (userData.gender === 'male') {
        bmr = 10 * userData.weight + 6.25 * userData.height - 5 * age + 5;
    } else {
        bmr = 10 * userData.weight + 6.25 * userData.height - 5 * age - 161;
    }
    
    const activityMultipliers = {
        'low': 1.2,
        'moderate': 1.55,
        'high': 1.9
    };
    
    const activityMultiplier = activityMultipliers[userData.activity] || 1.2;
    let tdee = bmr * activityMultiplier;
    
    const goalAdjustments = {
        'lose': 0.85,
        'maintain': 1.0,
        'gain': 1.15
    };
    
    const goalAdjustment = goalAdjustments[userData.goal] || 1.0;
    return tdee * goalAdjustment;
}

async function saveUserData() {
    if (!userData) return;
    
    const userDataStr = JSON.stringify(userData);
    
    // Сохраняем через saveToStorage (он сохранит в localStorage и синхронизирует в CloudStorage)
    await saveToStorage('klyro_user_data', userDataStr);
    lastUserDataHash = getDataHash(userData);
}

function editProfile() {
    showOnboardingScreen();
    
    if (userData.gender) {
        const genderInput = document.querySelector(`input[name="gender"][value="${userData.gender}"]`);
        if (genderInput) {
            genderInput.checked = true;
        }
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
    
    currentStep = 1;
    showOnboardingScreen();
}

function recalculateCalories() {
    if (!userData) {
        showNotification('Сначала заполните данные профиля');
        return;
    }
    
    const newCalories = calculateCalories();
    userData.calories = newCalories;
    saveUserData();
    
    document.getElementById('calories-value').textContent = Math.round(newCalories);
    showNotification('Калории пересчитаны!');
}

function hideAllScreens() {
    try {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            screen.classList.remove('active');
            screen.style.display = 'none';
            screen.style.visibility = 'hidden';
            screen.style.opacity = '0';
        });
    } catch (e) {
        console.error('[SCREEN] Error:', e);
    }
}

// ============================================
// ТРЕКЕР ПИТАНИЯ
// ============================================

let productsDatabase = [];
let selectedProduct = null;
let macrosChart = null;
let caloriesChart = null;
let weightChart = null;
let currentDiaryDate = new Date().toISOString().split('T')[0];
let currentHistoryPeriod = 7;
let productsDatabaseLoaded = false;

const PRODUCTS_DB_VERSION = '1.0';
const PRODUCTS_CACHE_KEY = 'klyro_products_db';
const PRODUCTS_CACHE_VERSION_KEY = 'klyro_products_db_version';

async function loadProductsDatabase() {
    if (productsDatabaseLoaded && productsDatabase.length > 0) {
        return;
    }
    
    try {
        const cachedVersion = localStorage.getItem(PRODUCTS_CACHE_VERSION_KEY);
        const cachedData = localStorage.getItem(PRODUCTS_CACHE_KEY);
        
        if (cachedVersion === PRODUCTS_DB_VERSION && cachedData) {
            try {
                productsDatabase = JSON.parse(cachedData);
                productsDatabaseLoaded = true;
                updateProductsCache();
                return;
            } catch (e) {
                localStorage.removeItem(PRODUCTS_CACHE_KEY);
                localStorage.removeItem(PRODUCTS_CACHE_VERSION_KEY);
            }
        }
        
        const response = await fetch('data/products.json?v=' + PRODUCTS_DB_VERSION);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        productsDatabase = await response.json();
        productsDatabaseLoaded = true;
        
        try {
            localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(productsDatabase));
            localStorage.setItem(PRODUCTS_CACHE_VERSION_KEY, PRODUCTS_DB_VERSION);
        } catch (e) {
            try {
                localStorage.removeItem('klyro_products_db');
                localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(productsDatabase));
                localStorage.setItem(PRODUCTS_CACHE_VERSION_KEY, PRODUCTS_DB_VERSION);
            } catch (e2) {
                console.error('[PRODUCTS] Cache save failed:', e2);
            }
        }
    } catch (e) {
        console.error('[PRODUCTS] Error:', e);
        productsDatabase = [];
        productsDatabaseLoaded = false;
    }
}

async function updateProductsCache() {
    try {
        const response = await fetch('data/products.json?v=' + PRODUCTS_DB_VERSION + '&t=' + Date.now());
        if (response.ok) {
            const freshData = await response.json();
            if (freshData.length > 0) {
                productsDatabase = freshData;
                localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(freshData));
                localStorage.setItem(PRODUCTS_CACHE_VERSION_KEY, PRODUCTS_DB_VERSION);
            }
        }
    } catch (e) {
        // Ignore
    }
}

function updateDashboard() {
    if (!userData) return;
    
    const consumedEl = document.getElementById('consumed-calories');
    const targetEl = document.getElementById('target-calories');
    const progressEl = document.getElementById('calories-progress-fill');
    const dateEl = document.getElementById('today-date');
    const chartEl = document.getElementById('macros-chart');
    
    if (!consumedEl || !targetEl || !progressEl) return;
    
    const today = new Date().toISOString().split('T')[0];
    const diary = getDiaryForDate(today);
    const totalKcal = diary.reduce((sum, item) => sum + item.kcal, 0);
    const totalProtein = diary.reduce((sum, item) => sum + item.protein, 0);
    const totalFat = diary.reduce((sum, item) => sum + item.fat, 0);
    const totalCarbs = diary.reduce((sum, item) => sum + item.carbs, 0);
    
    const targetCalories = calculateCalories();
    
    consumedEl.textContent = Math.round(totalKcal);
    targetEl.textContent = Math.round(targetCalories);
    
    const progress = targetCalories > 0 ? Math.min((totalKcal / targetCalories) * 100, 100) : 0;
    progressEl.style.width = `${progress}%`;
    
    if (dateEl) {
        const date = new Date();
        dateEl.textContent = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    }
    
    if (chartEl) {
        updateMacrosChart(totalProtein, totalFat, totalCarbs);
    }
}

function updateMacrosChart(protein, fat, carbs) {
    const ctx = document.getElementById('macros-chart');
    if (!ctx) return;
    
    if (macrosChart) {
        macrosChart.destroy();
    }
    
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
    
    document.getElementById('protein-value').textContent = `${protein.toFixed(1)}г`;
    document.getElementById('fat-value').textContent = `${fat.toFixed(1)}г`;
    document.getElementById('carbs-value').textContent = `${carbs.toFixed(1)}г`;
}

const originalShowProfileScreen = showProfileScreen;

function showProfileScreenExtended() {
    originalShowProfileScreen();
    setTimeout(() => {
        try {
            updateDashboard();
        } catch (e) {
            console.error('[DASHBOARD] Error:', e);
        }
    }, 300);
}

showProfileScreen = showProfileScreenExtended;

async function showAddFoodScreen() {
    hideAllScreens();
    const screen = document.getElementById('add-food-screen');
    if (screen) {
        screen.classList.add('active');
        screen.style.display = 'block';
        screen.style.visibility = 'visible';
        screen.style.opacity = '1';
    }
    const foodSearch = document.getElementById('food-search');
    if (foodSearch) {
        foodSearch.value = '';
        foodSearch.focus();
    }
    
    if (!productsDatabaseLoaded || productsDatabase.length === 0) {
        const productsList = document.getElementById('products-list');
        if (productsList) {
            productsList.innerHTML = '<div class="loading-indicator">Загрузка базы продуктов...</div>';
        }
        await loadProductsDatabase();
    }
    
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
    if (screen) {
        screen.classList.add('active');
        screen.style.display = 'block';
        screen.style.visibility = 'visible';
        screen.style.opacity = '1';
    }
    
    const productNameEl = document.getElementById('selected-product-name');
    if (productNameEl) {
        productNameEl.textContent = selectedProduct.name;
    }
    const productGramsEl = document.getElementById('product-grams');
    if (productGramsEl) {
        productGramsEl.value = 100;
    }
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
    if (!selectedProduct) {
        showNotification('Выберите продукт');
        return;
    }
    
    const gramsEl = document.getElementById('product-grams');
    if (!gramsEl) return;
    
    const grams = parseFloat(gramsEl.value) || 100;
    const multiplier = grams / 100;
    
    const entry = {
        id: Date.now().toString(),
        name: selectedProduct.name || 'Продукт',
        grams: grams,
        kcal: (selectedProduct.kcal || 0) * multiplier,
        protein: (selectedProduct.protein || 0) * multiplier,
        fat: (selectedProduct.fat || 0) * multiplier,
        carbs: (selectedProduct.carbs || 0) * multiplier,
        timestamp: new Date().toISOString()
    };
    
    // Добавляем запись (сохранение происходит внутри)
    addDiaryEntry(currentDiaryDate, entry).then(() => {
        showNotification('Продукт добавлен в дневник!');
        showDiaryScreen();
    }).catch(e => {
        console.error('[DIARY] Error:', e);
        showNotification('Ошибка при добавлении продукта');
    });
}

function showCustomProductForm() {
    hideAllScreens();
    const screen = document.getElementById('custom-product-screen');
    if (screen) {
        screen.classList.add('active');
        screen.style.display = 'block';
        screen.style.visibility = 'visible';
        screen.style.opacity = '1';
    }
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

async function loadDiaryFromCloud() {
    // Используем общую функцию синхронизации
    await syncFromCloud();
}

function getDiary() {
    try {
        const diaryStr = loadFromStorageSync('klyro_diary');
        if (!diaryStr) return {};
        return JSON.parse(diaryStr);
    } catch (e) {
        console.error('[DIARY] Error parsing diary:', e);
        // Если данные повреждены, возвращаем пустой объект
        localStorage.removeItem('klyro_diary');
        return {};
    }
}

async function saveDiary(diary) {
    const diaryStr = JSON.stringify(diary);
    
    // ВСЕГДА сохраняем в localStorage первым делом
    localStorage.setItem('klyro_diary', diaryStr);
    lastDiaryHash = getDataHash(diary);
    
    // Затем синхронизируем в CloudStorage в фоне (не блокируем)
    if (tgReady && tg && tg.CloudStorage && typeof tg.CloudStorage.setItem === 'function') {
        // Выполняем асинхронно, не ждем результата
        tg.CloudStorage.setItem('klyro_diary', diaryStr).catch(() => {
            // Игнорируем ошибки - данные уже в localStorage
        });
    }
}

function getDiaryForDate(date) {
    const diary = getDiary();
    return diary[date] || [];
}

async function addDiaryEntry(date, entry) {
    // Простое добавление без сложных проверок
    const diary = getDiary();
    if (!diary[date]) {
        diary[date] = [];
    }
    diary[date].push(entry);
    await saveDiary(diary);
}

async function removeDiaryEntry(date, entryId) {
    const diary = getDiary();
    if (diary[date]) {
        diary[date] = diary[date].filter(item => item.id !== entryId);
        await saveDiary(diary);
    }
}

function showDiaryScreen() {
    hideAllScreens();
    const screen = document.getElementById('diary-screen');
    if (screen) {
        screen.classList.add('active');
        screen.style.display = 'block';
        screen.style.visibility = 'visible';
        screen.style.opacity = '1';
    }
    
    // Сначала показываем локальные данные
    renderDiary();
    
    // Затем синхронизируем с CloudStorage для получения актуальных данных с других устройств
    syncFromCloud().then(() => {
        renderDiary();
        if (typeof updateDashboard === 'function') {
            updateDashboard();
        }
    }).catch(e => {
        console.error('[DIARY] Sync error:', e);
    });
}

function renderDiary() {
    const date = currentDiaryDate;
    const entries = getDiaryForDate(date);
    
    const dateObj = new Date(date);
    document.getElementById('diary-date').textContent = dateObj.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'long',
        weekday: 'long'
    });
    
    const totalKcal = entries.reduce((sum, item) => sum + item.kcal, 0);
    const totalProtein = entries.reduce((sum, item) => sum + item.protein, 0);
    const totalFat = entries.reduce((sum, item) => sum + item.fat, 0);
    const totalCarbs = entries.reduce((sum, item) => sum + item.carbs, 0);
    
    document.getElementById('diary-total-kcal').textContent = Math.round(totalKcal);
    document.getElementById('diary-total-protein').textContent = `${totalProtein.toFixed(1)}г`;
    document.getElementById('diary-total-fat').textContent = `${totalFat.toFixed(1)}г`;
    document.getElementById('diary-total-carbs').textContent = `${totalCarbs.toFixed(1)}г`;
    
    const mealsContainer = document.getElementById('diary-meals');
    if (entries.length === 0) {
        mealsContainer.innerHTML = '<div class="empty-state">Нет записей за этот день</div>';
        return;
    }
    
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
        removeDiaryEntry(currentDiaryDate, entryId).then(() => {
            renderDiary();
            if (typeof updateDashboard === 'function') {
                updateDashboard();
            }
        }).catch(e => {
            console.error('[DIARY] Error:', e);
            showNotification('Ошибка при удалении записи');
        });
    }
}

function showHistoryScreen() {
    hideAllScreens();
    const screen = document.getElementById('history-screen');
    if (screen) {
        screen.classList.add('active');
        screen.style.display = 'block';
        screen.style.visibility = 'visible';
        screen.style.opacity = '1';
    }
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
        weights.push(null);
    }
    
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
    if (screen) {
        screen.classList.add('active');
        screen.style.display = 'block';
        screen.style.visibility = 'visible';
        screen.style.opacity = '1';
    }
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

function saveActivities(activities) {
    localStorage.setItem('klyro_activities', JSON.stringify(activities));
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
        addDiaryEntry(currentDiaryDate, entry).catch(e => {
            console.error('[ACTIVITY] Error:', e);
        });
    }
    
    showNotification('Тренировка сохранена!');
    showActivityScreen();
}

function showAddActivityForm() {
    hideAllScreens();
    const screen = document.getElementById('add-activity-screen');
    if (screen) {
        screen.classList.add('active');
        screen.style.display = 'block';
        screen.style.visibility = 'visible';
        screen.style.opacity = '1';
    }
    const durationEl = document.getElementById('activity-duration');
    if (durationEl) {
        durationEl.value = 30;
    }
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

window.nextStep = nextStep;
window.prevStep = prevStep;
window.completeOnboarding = completeOnboarding;
window.editProfile = editProfile;
window.recalculateCalories = recalculateCalories;
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

function showSettingsScreen() {
    hideAllScreens();
    const screen = document.getElementById('settings-screen');
    if (screen) {
        screen.classList.add('active');
        screen.style.display = 'block';
        screen.style.visibility = 'visible';
        screen.style.opacity = '1';
    }
    
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
    
    let csv = 'Дата,Продукт,Вес (г),Калории,Белки (г),Жиры (г),Углеводы (г),Время\n';
    
    Object.keys(diary).forEach(date => {
        diary[date].forEach(entry => {
            const time = new Date(entry.timestamp).toLocaleTimeString('ru-RU');
            csv += `${date},"${entry.name}",${entry.grams},${entry.kcal.toFixed(1)},${entry.protein.toFixed(1)},${entry.fat.toFixed(1)},${entry.carbs.toFixed(1)},${time}\n`;
        });
    });
    
    csv += '\nТренировки\n';
    csv += 'Дата,Активность,Длительность (мин),Калории\n';
    activities.forEach(activity => {
        const date = new Date(activity.timestamp).toISOString().split('T')[0];
        csv += `${date},"${activity.name}",${activity.duration},${activity.calories}\n`;
    });
    
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
            
            event.target.value = '';
        } catch (error) {
            console.error('Import error:', error);
            showNotification('Ошибка при импорте данных');
        }
    };
    reader.readAsText(file);
}

window.showSettingsScreen = showSettingsScreen;
window.setUnits = setUnits;
window.exportData = exportData;
window.importData = importData;

function updateUsernameDisplay() {
    if (!userData) {
        const badge = document.getElementById('username-badge');
        if (badge) badge.style.display = 'none';
        return;
    }
    
    const badge = document.getElementById('username-badge');
    if (!badge) return;
    
    let username = userData.username || userData.firstName || 'Пользователь';
    
    if (username.startsWith('@')) {
        username = username.substring(1);
    }
    
    if (!userData.username && userData.firstName) {
        username = userData.firstName;
    }
    
    badge.textContent = `@${username}`;
    badge.style.display = 'block';
}

window.updateUsernameDisplay = updateUsernameDisplay;
