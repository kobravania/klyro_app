// Telegram Web App API
let tg;
let tgReady = false;

// Инициализация Telegram WebApp (вызывается после загрузки страницы)
function initTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        console.log('[TELEGRAM] Telegram WebApp API found');
        
        // Вызываем ready() для инициализации
        tg.ready();
        tg.expand();
        
        // Небольшая задержка для полной инициализации CloudStorage
        setTimeout(() => {
            tgReady = true;
            console.log('[TELEGRAM] Telegram WebApp ready');
            console.log('[TELEGRAM] CloudStorage available:', !!tg.CloudStorage);
            if (tg.CloudStorage) {
                console.log('[TELEGRAM] CloudStorage methods:', {
                    setItem: typeof tg.CloudStorage.setItem,
                    getItem: typeof tg.CloudStorage.getItem,
                    getItems: typeof tg.CloudStorage.getItems,
                    removeItem: typeof tg.CloudStorage.removeItem
                });
            }
        }, 100);
    } else {
        tg = {
            ready: () => {},
            expand: () => {},
            initDataUnsafe: {},
            showAlert: (message) => alert(message),
            CloudStorage: null
        };
        tgReady = true; // В браузере считаем готовым сразу
        console.log('[TELEGRAM] Telegram WebApp API not found, using fallback');
    }
}

// Инициализируем при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTelegramWebApp);
} else {
    initTelegramWebApp();
}

// ============================================
// ОБЕРТКА ДЛЯ ХРАНЕНИЯ ДАННЫХ (CloudStorage + localStorage fallback)
// ============================================

// Асинхронное сохранение данных с синхронизацией между устройствами
async function saveToStorage(key, value) {
    try {
        console.log(`[STORAGE] Attempting to save ${key}, value length: ${value ? value.length : 0}`);
        
        // ВАЖНО: Сначала сохраняем в localStorage для быстрого доступа
        try {
            localStorage.setItem(key, value);
            console.log(`[STORAGE] ✓ Saved to localStorage: ${key}`);
        } catch (e) {
            console.warn('[STORAGE] localStorage save failed:', e);
        }
        
        // Затем сохраняем в Telegram Cloud Storage (синхронизируется между устройствами)
        // ВАЖНО: Проверяем, что WebApp готов и CloudStorage доступен
        if (tgReady && tg && tg.CloudStorage) {
            try {
                console.log(`[STORAGE] Saving to CloudStorage...`);
                console.log(`[STORAGE] tgReady: ${tgReady}, tg.CloudStorage available:`, !!tg.CloudStorage);
                console.log(`[STORAGE] tg.CloudStorage.setItem available:`, typeof tg.CloudStorage.setItem);
                
                // Сохраняем в CloudStorage
                await tg.CloudStorage.setItem(key, value);
                
                // Небольшая задержка перед проверкой (CloudStorage может быть асинхронным)
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // Проверяем, что данные действительно сохранились
                const verifyValue = await tg.CloudStorage.getItem(key);
                if (verifyValue === value) {
                    console.log(`[STORAGE] ✓ Saved to CloudStorage: ${key} (verified)`);
                } else if (verifyValue && verifyValue.length > 0) {
                    // Если значения не совпадают, но данные есть - возможно, это нормально (версионирование)
                    console.log(`[STORAGE] ✓ Saved to CloudStorage: ${key} (data exists, length: ${verifyValue.length})`);
                } else {
                    console.warn(`[STORAGE] ⚠ Saved to CloudStorage but verification failed for: ${key}`);
                    console.warn(`[STORAGE] Expected length: ${value.length}, Got: ${verifyValue ? verifyValue.length : 'null/undefined'}`);
                }
                return true;
            } catch (cloudError) {
                console.error(`[STORAGE] ✗ CloudStorage save error:`, cloudError);
                console.error(`[STORAGE] Error details:`, {
                    name: cloudError?.name,
                    message: cloudError?.message,
                    stack: cloudError?.stack
                });
                // Если CloudStorage не работает, хотя бы localStorage сохранен
                return true;
            }
        } else {
            console.log(`[STORAGE] CloudStorage not available (tgReady: ${tgReady}, tg: ${!!tg}, CloudStorage: ${tg ? !!tg.CloudStorage : 'N/A'}), only localStorage used`);
            return true;
        }
    } catch (error) {
        console.error(`[STORAGE] ✗ Error saving ${key}:`, error);
        // Fallback на localStorage при ошибке
        try {
            localStorage.setItem(key, value);
            console.log(`[STORAGE] ✓ Fallback to localStorage: ${key}`);
            return true;
        } catch (e) {
            console.error(`[STORAGE] ✗ localStorage fallback failed:`, e);
            return false;
        }
    }
}

// Асинхронная загрузка данных (приоритет CloudStorage для синхронизации)
async function loadFromStorage(key) {
    try {
        // ВСЕГДА сначала пробуем загрузить из Telegram Cloud Storage (для синхронизации между устройствами)
        // ВАЖНО: Проверяем, что WebApp готов
        if (tgReady && tg && tg.CloudStorage) {
            try {
                const value = await tg.CloudStorage.getItem(key);
                if (value !== null && value !== undefined && value !== '') {
                    console.log(`[STORAGE] ✓ Loaded from CloudStorage: ${key}, length: ${value.length}`);
                    // Обновляем localStorage для быстрого доступа
                    try {
                        localStorage.setItem(key, value);
                    } catch (e) {
                        console.warn('[STORAGE] localStorage sync failed:', e);
                    }
                    return value;
                }
            } catch (cloudError) {
                console.error(`[STORAGE] CloudStorage getItem error for ${key}:`, cloudError);
            }
        }
        
        // Fallback на localStorage (только если CloudStorage пуст или недоступен)
        const value = localStorage.getItem(key);
        if (value !== null && value !== '') {
            console.log(`[STORAGE] Loaded from localStorage: ${key}`);
            // Если CloudStorage доступен, но был пуст, синхронизируем данные из localStorage (асинхронно, не блокируем)
            if (tgReady && tg && tg.CloudStorage) {
                // Делаем синхронизацию асинхронно, не ждем
                tg.CloudStorage.setItem(key, value).then(() => {
                    console.log(`[STORAGE] ✓ Synced localStorage to CloudStorage: ${key}`);
                }).catch(e => {
                    console.warn('[STORAGE] CloudStorage sync failed:', e);
                });
            }
            return value;
        }
        
        return null;
    } catch (error) {
        console.error(`[STORAGE] Error loading ${key}:`, error);
        // Fallback на localStorage
        try {
            const value = localStorage.getItem(key);
            return value;
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

// Отслеживание изменений для оптимизированной синхронизации
let lastDiaryHash = null;
let lastUserDataHash = null;
let pendingSync = false;

// Вычисление хэша данных для отслеживания изменений
function getDataHash(data) {
    return btoa(JSON.stringify(data)).substring(0, 16);
}

// Оптимизированная синхронизация данных из CloudStorage (только при изменениях)
function startDataSync() {
    if (!tgReady || !tg || !tg.CloudStorage) {
        console.log('[SYNC] CloudStorage not ready, skipping sync');
        return;
    }
    
    // Инициализируем хэши при старте
    const currentDiary = getDiary();
    lastDiaryHash = getDataHash(currentDiary);
    if (userData) {
        lastUserDataHash = getDataHash(userData);
    }
    
    // Синхронизация только при изменениях (проверка каждые 60 секунд)
    setInterval(async () => {
        if (pendingSync) {
            console.log('[SYNC] Sync already in progress, skipping...');
            return;
        }
        
        try {
            // Проверяем, были ли изменения локально
            const currentDiary = getDiary();
            const currentDiaryHash = getDataHash(currentDiary);
            const currentUserDataHash = userData ? getDataHash(userData) : null;
            
            let needsSync = false;
            
            // Проверяем изменения дневника
            if (currentDiaryHash !== lastDiaryHash) {
                console.log('[SYNC] Diary changed locally, syncing...');
                pendingSync = true;
                await saveToStorage('klyro_diary', JSON.stringify(currentDiary));
                lastDiaryHash = currentDiaryHash;
                needsSync = true;
                pendingSync = false;
            }
            
            // Проверяем изменения данных пользователя
            if (userData && currentUserDataHash !== lastUserDataHash) {
                console.log('[SYNC] User data changed locally, syncing...');
                pendingSync = true;
                await saveToStorage('klyro_user_data', JSON.stringify(userData));
                lastUserDataHash = currentUserDataHash;
                needsSync = true;
                pendingSync = false;
            }
            
            // Загружаем изменения из CloudStorage (только если нет локальных изменений)
            if (!needsSync) {
                const cloudDiaryStr = await loadFromStorage('klyro_diary');
                if (cloudDiaryStr) {
                    const cloudDiary = JSON.parse(cloudDiaryStr);
                    const cloudDiaryHash = getDataHash(cloudDiary);
                    if (cloudDiaryHash !== lastDiaryHash) {
                        console.log('[SYNC] Cloud diary updated, applying...');
                        localStorage.setItem('klyro_diary', cloudDiaryStr);
                        lastDiaryHash = cloudDiaryHash;
                        // Обновляем отображение если нужно
                        if (document.getElementById('diary-screen')?.classList.contains('active')) {
                            const today = new Date().toISOString().split('T')[0];
                            renderDiary(today);
                        }
                        if (typeof updateDashboard === 'function') {
                            updateDashboard();
                        }
                    }
                }
            }
        } catch (e) {
            console.error('[SYNC] Sync error:', e);
            pendingSync = false;
        }
    }, 60000); // 60 секунд (увеличено с 30)
    
    // Синхронизируем при фокусе окна
    window.addEventListener('focus', async () => {
        console.log('[SYNC] Window focused, checking for updates...');
        await loadDiaryFromCloud();
    });
    
    // Синхронизируем при видимости страницы
    document.addEventListener('visibilitychange', async () => {
        if (!document.hidden) {
            console.log('[SYNC] Page visible, checking for updates...');
            await loadDiaryFromCloud();
        }
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

// Инициализация приложения
function initApp() {
    console.log('=== Klyro App Initializing ===');
    
    // Telegram WebApp уже инициализирован в initTelegramWebApp()
    if (tg && tgReady) {
        console.log('Telegram WebApp initialized');
        // Запускаем периодическую синхронизацию данных из CloudStorage
        if (tg.CloudStorage) {
            startDataSync();
        }
    }
    
    // КРИТИЧНО: Гарантируем показ экрана через 1 секунду максимум
    const screenTimeout = setTimeout(() => {
        console.warn('[INIT] Timeout: Forcing screen display after 1 second');
        if (typeof hideAllScreens === 'function') {
            hideAllScreens();
        }
        // Проверяем, есть ли активный экран
        const activeScreen = document.querySelector('.screen.active');
        if (!activeScreen) {
            console.warn('[INIT] No active screen found, showing default');
            if (window.Telegram && window.Telegram.WebApp) {
                if (typeof showOnboardingScreen === 'function') {
                    showOnboardingScreen();
                }
            } else {
                if (typeof showAuthScreen === 'function') {
                    showAuthScreen();
                }
            }
        }
    }, 1000);
    
    // Проверяем данные пользователя - это единственное место, где решается, что показывать
    checkUserAuth().then(() => {
        clearTimeout(screenTimeout);
        console.log('[INIT] checkUserAuth completed successfully');
    }).catch(e => {
        clearTimeout(screenTimeout);
        console.error('[INIT] Error in checkUserAuth:', e);
        // Fallback - показываем онбординг или авторизацию
        if (window.Telegram && window.Telegram.WebApp) {
            if (typeof showOnboardingScreen === 'function') {
                showOnboardingScreen();
            }
        } else {
            if (typeof showAuthScreen === 'function') {
                showAuthScreen();
            }
        }
    });
}

// Функция для запуска инициализации
function startApp() {
    // Ждём готовности DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        // DOM уже загружен, запускаем сразу
        initApp();
    }
}

// Запускаем инициализацию только после полной загрузки скрипта
if (document.readyState === 'complete') {
    startApp();
} else {
    window.addEventListener('load', startApp);
}

// Проверка авторизации и загрузка данных
async function checkUserAuth() {
    try {
        console.log('[AUTH] Starting checkUserAuth...');
        
        // Скрываем loading screen
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.remove('active');
            loadingScreen.style.display = 'none';
            loadingScreen.style.visibility = 'hidden';
            loadingScreen.style.opacity = '0';
        }
        
        // Загружаем данные из хранилища
        let savedData = null;
        
        // Сначала проверяем localStorage (быстро)
        try {
            savedData = loadFromStorageSync('klyro_user_data');
            console.log('[AUTH] localStorage check:', savedData ? `found (${savedData.length} chars)` : 'not found');
            if (savedData) {
                try {
                    const testParse = JSON.parse(savedData);
                    console.log('[AUTH] localStorage test parse:', {
                        hasDateOfBirth: !!testParse.dateOfBirth,
                        hasAge: !!testParse.age,
                        hasHeight: !!testParse.height,
                        dateOfBirth: testParse.dateOfBirth,
                        height: testParse.height
                    });
                } catch (e) {
                    console.error('[AUTH] localStorage parse error:', e);
                }
            }
        } catch (e) {
            console.error('[AUTH] localStorage read error:', e);
        }
        
        // Если нет данных в localStorage, пробуем CloudStorage (с таймаутом)
        if (!savedData && tgReady && tg && tg.CloudStorage) {
            try {
                console.log('[AUTH] Trying CloudStorage...');
                const cloudPromise = loadFromStorage('klyro_user_data');
                const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1500));
                savedData = await Promise.race([cloudPromise, timeoutPromise]);
                console.log('[AUTH] CloudStorage result:', savedData ? 'found' : 'not found');
            } catch (e) {
                console.warn('[AUTH] CloudStorage load failed:', e);
            }
        }
        
        if (savedData) {
            try {
                userData = JSON.parse(savedData);
                console.log('[AUTH] Parsed userData:', {
                    dateOfBirth: userData.dateOfBirth,
                    age: userData.age,
                    height: userData.height,
                    weight: userData.weight,
                    gender: userData.gender,
                    fullData: userData
                });
                
                // КРИТИЧНО: Проверяем наличие ОБЯЗАТЕЛЬНЫХ полей
                const hasDateOfBirth = !!(userData.dateOfBirth || userData.age);
                const hasHeight = !!userData.height;
                const hasProfileData = hasDateOfBirth && hasHeight;
                
                console.log('[AUTH] Profile data check:', {
                    hasProfileData: hasProfileData,
                    hasDateOfBirth: hasDateOfBirth,
                    hasAge: !!userData.age,
                    hasHeight: hasHeight,
                    dateOfBirthValue: userData.dateOfBirth,
                    heightValue: userData.height
                });
                
                if (!hasProfileData) {
                    console.warn('[AUTH] Missing profile data:', {
                        hasDateOfBirth: hasDateOfBirth,
                        hasAge: !!userData.age,
                        hasHeight: hasHeight,
                        dateOfBirth: userData.dateOfBirth,
                        height: userData.height
                    });
                    // Если данных нет, показываем онбординг
                    if (window.Telegram && window.Telegram.WebApp) {
                        showOnboardingScreen();
                    } else {
                        showAuthScreen();
                    }
                    return;
                }
                
                if (hasProfileData) {
                    // Инициализируем хэши для синхронизации
                    lastUserDataHash = getDataHash(userData);
                    if (typeof getDiary === 'function') {
                        const diary = getDiary();
                        if (diary && Object.keys(diary).length > 0) {
                            lastDiaryHash = getDataHash(diary);
                        }
                    }
                    console.log('[AUTH] Showing profile screen');
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
                console.error('[AUTH] Error parsing saved data:', e);
                localStorage.removeItem('klyro_user_data');
            }
        }

        // Обновляем данные Telegram, если доступны
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
            const initData = window.Telegram.WebApp.initDataUnsafe;
            if (initData.user) {
                if (!userData) userData = {};
                const telegramUser = initData.user;
                userData.id = telegramUser.id;
                userData.firstName = telegramUser.first_name || 'Пользователь';
                userData.lastName = telegramUser.last_name || '';
                userData.username = telegramUser.username || '';
                userData.photoUrl = telegramUser.photo_url || '';
                
                if (typeof updateUsernameDisplay === 'function') {
                    updateUsernameDisplay();
                }
                
                const hasExistingProfile = userData && (userData.dateOfBirth || userData.age) && userData.height;
                if (hasExistingProfile) {
                    lastUserDataHash = getDataHash(userData);
                    await saveUserData();
                    console.log('[AUTH] Showing profile screen (from Telegram)');
                    showProfileScreen();
                    if (typeof loadDiaryFromCloud === 'function') {
                        loadDiaryFromCloud();
                    }
                    return;
                }
            }
        }
        
        // Если нет данных профиля, показываем онбординг или авторизацию
        console.log('[AUTH] No profile data, showing onboarding/auth');
        if (window.Telegram && window.Telegram.WebApp) {
            showOnboardingScreen();
        } else {
            showAuthScreen();
        }
    } catch (e) {
        console.error('[AUTH] Error in checkUserAuth:', e);
        console.error('[AUTH] Stack:', e.stack);
        // ВАЖНО: Всегда показываем экран, даже при ошибке
        if (window.Telegram && window.Telegram.WebApp) {
            showOnboardingScreen();
        } else {
            showAuthScreen();
        }
    }
}

// Показать экран авторизации
function showAuthScreen() {
    console.log('[SCREEN] showAuthScreen called');
    hideAllScreens();
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) {
        authScreen.classList.add('active');
        authScreen.style.display = 'block';
        authScreen.style.visibility = 'visible';
        authScreen.style.opacity = '1';
        console.log('[SCREEN] Auth screen shown');
    } else {
        console.error('[SCREEN] Auth screen element not found!');
        return;
    }
    
    const authButton = document.getElementById('auth-button');
    if (authButton) {
        // Удаляем старые обработчики, если есть
        const newAuthButton = authButton.cloneNode(true);
        authButton.parentNode.replaceChild(newAuthButton, authButton);
        
        newAuthButton.addEventListener('click', () => {
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
}

// Инициализация кастомного date picker
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
    
    // Заполняем месяцы
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    
    monthNames.forEach((name, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = name;
        datePickerMonth.appendChild(option);
    });
    
    // Заполняем годы
    for (let year = maxYear; year >= minYear; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        datePickerYear.appendChild(option);
    }
    
    // Инициализация из userData
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
    
    // Обновление календаря
    function updateCalendar() {
        datePickerMonth.value = currentDate.getMonth();
        datePickerYear.value = currentDate.getFullYear();
        
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Понедельник = 0
        
        datePickerDays.innerHTML = '';
        
        // Пустые ячейки для дней предыдущего месяца
        for (let i = 0; i < startingDayOfWeek; i++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'date-picker-day date-picker-day-other';
            datePickerDays.appendChild(dayCell);
        }
        
        // Дни текущего месяца
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
                console.log('[DATE] Date selected:', selectedDate);
                updateCalendar();
                updateDateInput();
            });
            
            datePickerDays.appendChild(dayCell);
        }
    }
    
    // Обновление отображаемой даты
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
                console.log('[DATE] Date updated:', {
                    display: dateString,
                    iso: isoDate,
                    hiddenValue: dateOfBirthValue.value
                });
            } else {
                console.error('[DATE] dateOfBirthValue element not found!');
            }
        } else {
            if (dateInput) dateInput.value = '';
            if (dateOfBirthValue) dateOfBirthValue.value = '';
            console.log('[DATE] Date cleared');
        }
    }
    
    // Навигация
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
        dateOfBirthValue.value = '';
        updateCalendar();
    });
    
    confirmBtn.addEventListener('click', () => {
        datePicker.style.display = 'none';
    });
    
    // Открытие календаря
    dateInput.addEventListener('click', (e) => {
        e.preventDefault();
        if (datePicker.style.display === 'none') {
            datePicker.style.display = 'block';
            updateCalendar();
        } else {
            datePicker.style.display = 'none';
        }
    });
    
    // Закрытие при клике вне календаря
    document.addEventListener('click', (e) => {
        if (!datePicker.contains(e.target) && e.target !== dateInput) {
            datePicker.style.display = 'none';
        }
    });
    
    // Инициализация
    updateCalendar();
    if (selectedDate) {
        updateDateInput();
    }
}

// Инициализация слайдеров роста и веса
function initHeightWeightSliders() {
    const heightSlider = document.getElementById('height');
    const weightSlider = document.getElementById('weight');
    const heightValue = document.getElementById('heightValue');
    const weightValue = document.getElementById('weightValue');
    
    // Инициализация значений из userData или дефолтные
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

// Показать экран онбординга
function showOnboardingScreen() {
    console.log('[SCREEN] showOnboardingScreen called');
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
        
        // Инициализируем input для даты рождения и слайдеры для роста и веса
        initDateInput();
        initHeightWeightSliders();
        console.log('[SCREEN] Onboarding screen shown');
    } else {
        console.error('[SCREEN] Onboarding screen element not found!');
    }
}

// Показать экран профиля
function showProfileScreen() {
    console.log('[SCREEN] showProfileScreen called');
    hideAllScreens();
    const profileScreen = document.getElementById('profile-screen');
    if (profileScreen) {
        profileScreen.classList.add('active');
        profileScreen.style.display = 'block';
        profileScreen.style.visibility = 'visible';
        profileScreen.style.opacity = '1';
        console.log('[SCREEN] Profile screen shown');
    } else {
        console.error('[SCREEN] Profile screen element not found!');
        return;
    }
    
    if (userData) {
        // Заполняем данные профиля
        document.getElementById('user-name').textContent = 
            `${userData.firstName} ${userData.lastName || ''}`.trim();
        
        // Обновляем username в углу
        updateUsernameDisplay();
        
        // Показываем параметры
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

// Вычисление возраста из даты рождения
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

// Получение возраста пользователя (из dateOfBirth или age для обратной совместимости)
function getUserAge() {
    if (userData && userData.dateOfBirth) {
        return calculateAge(userData.dateOfBirth);
    }
    // Обратная совместимость: если есть age, используем его
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

// Показать уведомление
function showNotification(message) {
    if (window.Telegram?.WebApp) {
        tg.showAlert(message);
    } else {
        alert(message);
    }
}

// Завершение онбординга
async function completeOnboarding() {
    if (!validateCurrentStep()) {
        return;
    }
    
    // Собираем все данные из слайдеров
    const genderInput = document.querySelector('input[name="gender"]:checked');
    const heightSlider = document.getElementById('height');
    const weightSlider = document.getElementById('weight');
    const activityInput = document.querySelector('input[name="activity"]:checked');
    const goalInput = document.querySelector('input[name="goal"]:checked');
    
    if (!userData) {
        userData = {};
    }
    
    // Сохраняем дату рождения (не возраст)
    const dateOfBirthValue = document.getElementById('dateOfBirthValue');
    const dateInput = document.getElementById('dateOfBirth');
    console.log('[ONBOARDING] Date inputs:', {
        dateOfBirthValue: dateOfBirthValue ? dateOfBirthValue.value : 'element not found',
        dateInput: dateInput ? dateInput.value : 'element not found'
    });
    
    if (dateOfBirthValue && dateOfBirthValue.value) {
        userData.dateOfBirth = dateOfBirthValue.value;
        // Вычисляем и сохраняем возраст для обратной совместимости
        userData.age = calculateAge(dateOfBirthValue.value);
        console.log('[ONBOARDING] Date of birth saved:', userData.dateOfBirth, 'Age:', userData.age);
    } else if (dateInput && dateInput.value) {
        // Fallback: пытаемся распарсить из текстового поля (формат DD.MM.YYYY)
        const dateMatch = dateInput.value.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (dateMatch) {
            const day = parseInt(dateMatch[1]);
            const month = parseInt(dateMatch[2]) - 1; // месяцы в JS начинаются с 0
            const year = parseInt(dateMatch[3]);
            const date = new Date(year, month, day);
            if (!isNaN(date.getTime())) {
                userData.dateOfBirth = date.toISOString().split('T')[0];
                userData.age = calculateAge(userData.dateOfBirth);
                console.log('[ONBOARDING] Date parsed from input field:', userData.dateOfBirth);
            }
        }
    }
    
    if (!userData.dateOfBirth) {
        console.error('[ONBOARDING] ✗ ERROR: Date of birth is missing!');
    }
    if (genderInput) userData.gender = genderInput.value;
    if (heightSlider) userData.height = parseInt(heightSlider.value);
    if (weightSlider) userData.weight = parseFloat(weightSlider.value);
    if (activityInput) userData.activity = activityInput.value;
    if (goalInput) userData.goal = goalInput.value;
    
    // Рассчитываем калории
    userData.calories = calculateCalories();
    
    // Сохраняем данные
    console.log('[ONBOARDING] Saving user data before showing profile...');
    console.log('[ONBOARDING] User data to save:', {
        dateOfBirth: userData.dateOfBirth,
        age: userData.age,
        height: userData.height,
        weight: userData.weight,
        gender: userData.gender,
        activity: userData.activity,
        goal: userData.goal,
        calories: userData.calories
    });
    
    // КРИТИЧНО: Сохраняем данные и ждем подтверждения
    console.log('[ONBOARDING] About to save userData:', JSON.stringify(userData, null, 2));
    const saveResult = await saveUserData();
    console.log('[ONBOARDING] saveUserData result:', saveResult);
    
    if (!saveResult) {
        console.error('[ONBOARDING] ✗ CRITICAL: saveUserData returned false!');
        showNotification('Ошибка сохранения данных. Пожалуйста, попробуйте еще раз.');
        return;
    }
    
    // Небольшая задержка для гарантии сохранения
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log('[ONBOARDING] User data saved, verifying...');
    
    // Проверяем, что данные сохранились (проверяем и localStorage и CloudStorage)
    let checkLocalData = null;
    try {
        checkLocalData = loadFromStorageSync('klyro_user_data');
        console.log('[ONBOARDING] localStorage check after save:', checkLocalData ? 'found' : 'NOT FOUND');
    } catch (e) {
        console.error('[ONBOARDING] ✗ ERROR reading localStorage:', e);
    }
    
    if (checkLocalData) {
        try {
            const parsed = JSON.parse(checkLocalData);
            const hasRequiredData = parsed.dateOfBirth && parsed.height;
            console.log('[ONBOARDING] ✓ Verification - localStorage data:', {
                dateOfBirth: parsed.dateOfBirth,
                age: parsed.age,
                height: parsed.height,
                weight: parsed.weight,
                gender: parsed.gender,
                hasRequiredData: hasRequiredData,
                fullData: parsed
            });
            
            if (!hasRequiredData) {
                console.error('[ONBOARDING] ✗ ERROR: Required data missing in saved data!');
                console.error('[ONBOARDING] Missing:', {
                    dateOfBirth: !parsed.dateOfBirth,
                    height: !parsed.height,
                    parsedData: parsed
                });
                showNotification('Ошибка: данные не сохранились полностью. Пожалуйста, попробуйте еще раз.');
                return;
            }
        } catch (e) {
            console.error('[ONBOARDING] ✗ ERROR parsing saved data:', e);
            showNotification('Ошибка сохранения данных. Пожалуйста, попробуйте еще раз.');
            return;
        }
    } else {
        console.error('[ONBOARDING] ✗ CRITICAL ERROR: Data was not saved to localStorage!');
        // Пытаемся сохранить еще раз
        console.log('[ONBOARDING] Retrying save...');
        const retryResult = await saveUserData();
        if (!retryResult) {
            console.error('[ONBOARDING] ✗ Retry also failed!');
            showNotification('Критическая ошибка сохранения. Пожалуйста, попробуйте еще раз.');
            return;
        }
        // Проверяем еще раз после повтора
        await new Promise(resolve => setTimeout(resolve, 300));
        checkLocalData = loadFromStorageSync('klyro_user_data');
        if (!checkLocalData) {
            console.error('[ONBOARDING] ✗ Still no data after retry!');
            showNotification('Не удалось сохранить данные. Пожалуйста, попробуйте еще раз.');
            return;
        }
    }
    
    // Проверяем CloudStorage
    if (tg && tg.CloudStorage) {
        try {
            const checkCloudData = await loadFromStorage('klyro_user_data');
            if (checkCloudData) {
                const parsed = JSON.parse(checkCloudData);
                console.log('[ONBOARDING] ✓ Verification - CloudStorage data:', {
                    dateOfBirth: parsed.dateOfBirth,
                    height: parsed.height,
                    weight: parsed.weight,
                    gender: parsed.gender
                });
            } else {
                console.warn('[ONBOARDING] ⚠ WARNING: Data was not saved to CloudStorage!');
            }
        } catch (e) {
            console.error('[ONBOARDING] ✗ ERROR checking CloudStorage:', e);
        }
    }
    
    // КРИТИЧНО: Проверяем еще раз перед показом профиля
    await new Promise(resolve => setTimeout(resolve, 100));
    const finalCheck = loadFromStorageSync('klyro_user_data');
    console.log('[ONBOARDING] Final check - localStorage:', finalCheck ? 'found' : 'NOT FOUND');
    
    if (finalCheck) {
        try {
            const finalParsed = JSON.parse(finalCheck);
            const hasFinalData = finalParsed.dateOfBirth && finalParsed.height;
            console.log('[ONBOARDING] Final check - parsed data:', {
                dateOfBirth: finalParsed.dateOfBirth,
                height: finalParsed.height,
                hasFinalData: hasFinalData,
                fullData: finalParsed
            });
            
            if (hasFinalData) {
                console.log('[ONBOARDING] ✓✓✓ Final check PASSED, showing profile');
                userData = finalParsed; // Обновляем userData из сохраненных данных
                // Дополнительная проверка перед показом
                if (userData.dateOfBirth && userData.height) {
                    showProfileScreen();
                    console.log('[ONBOARDING] ✓✓✓ Profile screen shown successfully');
                } else {
                    console.error('[ONBOARDING] ✗✗✗ userData still incomplete after assignment!');
                    console.error('[ONBOARDING] userData:', userData);
                    showNotification('Ошибка: данные неполные. Пожалуйста, попробуйте еще раз.');
                }
            } else {
                console.error('[ONBOARDING] ✗✗✗ Final check FAILED - data incomplete!');
                console.error('[ONBOARDING] Missing:', {
                    dateOfBirth: !finalParsed.dateOfBirth,
                    height: !finalParsed.height
                });
                console.error('[ONBOARDING] Final data:', finalParsed);
                showNotification('Ошибка сохранения данных. Пожалуйста, попробуйте еще раз.');
            }
        } catch (e) {
            console.error('[ONBOARDING] ✗✗✗ Final check error:', e);
            console.error('[ONBOARDING] Error stack:', e.stack);
            showNotification('Ошибка сохранения данных. Пожалуйста, попробуйте еще раз.');
        }
    } else {
        console.error('[ONBOARDING] ✗✗✗ Final check FAILED - no data found in localStorage!');
        showNotification('Критическая ошибка: данные не сохранились. Пожалуйста, попробуйте еще раз.');
    }
}

// Расчёт калорий по формуле Mifflin-St Jeor
function calculateCalories() {
    const age = getUserAge();
    if (!userData || age === null || !userData.gender || !userData.height || !userData.weight) {
        return 0;
    }
    
    // BMR (Basal Metabolic Rate) по формуле Mifflin-St Jeor
    let bmr;
    if (userData.gender === 'male') {
        bmr = 10 * userData.weight + 6.25 * userData.height - 5 * age + 5;
    } else {
        bmr = 10 * userData.weight + 6.25 * userData.height - 5 * age - 161;
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
    if (!userData) {
        console.warn('[USERDATA] No userData to save');
        return false;
    }
    
    const userDataStr = JSON.stringify(userData);
    console.log('[USERDATA] Saving user data:', {
        dateOfBirth: userData.dateOfBirth,
        age: userData.age,
        height: userData.height,
        weight: userData.weight,
        gender: userData.gender,
        activity: userData.activity,
        goal: userData.goal,
        dataLength: userDataStr.length
    });
    
    // ВАЖНО: Сохраняем в localStorage СНАЧАЛА (быстро и надежно)
    try {
        localStorage.setItem('klyro_user_data', userDataStr);
        console.log('[USERDATA] ✓ Saved to localStorage');
        
        // Проверяем, что сохранилось
        const verify = localStorage.getItem('klyro_user_data');
        if (verify === userDataStr) {
            console.log('[USERDATA] ✓ localStorage verification PASSED');
        } else {
            console.error('[USERDATA] ✗ localStorage verification FAILED!');
            console.error('[USERDATA] Expected length:', userDataStr.length, 'Got:', verify ? verify.length : 'null');
            return false;
        }
    } catch (e) {
        console.error('[USERDATA] ✗ localStorage save error:', e);
        return false;
    }
    
    // Обновляем хэш для отслеживания изменений
    lastUserDataHash = getDataHash(userData);
    
    // Сохраняем в CloudStorage для синхронизации (не блокируем, если не работает)
    try {
        await saveToStorage('klyro_user_data', userDataStr);
        console.log('[USERDATA] ✓ Saved to CloudStorage');
    } catch (e) {
        console.warn('[USERDATA] ⚠ CloudStorage save failed (but localStorage is OK):', e);
    }
    
    return true;
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
    // Переходим к онбордингу - слайдеры автоматически заполнятся из userData
    // через функции initDateSliders и initHeightWeightSliders
    showOnboardingScreen();
    
    // Устанавливаем пол если есть
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
        screens.forEach(screen => {
            screen.classList.remove('active');
            screen.style.display = 'none';
            screen.style.visibility = 'hidden';
            screen.style.opacity = '0';
        });
        console.log('[SCREEN] All screens hidden');
    } catch (e) {
        console.error('[SCREEN] Error hiding screens:', e);
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
let productsDatabaseLoaded = false; // Флаг загрузки базы продуктов

// Версия базы продуктов для кэширования (увеличивать при обновлении базы)
const PRODUCTS_DB_VERSION = '1.0';
const PRODUCTS_CACHE_KEY = 'klyro_products_db';
const PRODUCTS_CACHE_VERSION_KEY = 'klyro_products_db_version';

// Загрузка базы продуктов с кэшированием и lazy loading
async function loadProductsDatabase() {
    // Если уже загружена, не загружаем снова
    if (productsDatabaseLoaded && productsDatabase.length > 0) {
        console.log('[PRODUCTS] Database already loaded from memory');
        return;
    }
    
    try {
        // Проверяем кэш в localStorage
        const cachedVersion = localStorage.getItem(PRODUCTS_CACHE_VERSION_KEY);
        const cachedData = localStorage.getItem(PRODUCTS_CACHE_KEY);
        
        if (cachedVersion === PRODUCTS_DB_VERSION && cachedData) {
            try {
                productsDatabase = JSON.parse(cachedData);
                productsDatabaseLoaded = true;
                console.log(`[PRODUCTS] Loaded ${productsDatabase.length} products from cache`);
                // Загружаем в фоне для обновления кэша
                updateProductsCache();
                return;
            } catch (e) {
                console.warn('[PRODUCTS] Cache parse error, loading from server:', e);
                localStorage.removeItem(PRODUCTS_CACHE_KEY);
                localStorage.removeItem(PRODUCTS_CACHE_VERSION_KEY);
            }
        }
        
        // Загружаем с сервера
        console.log('[PRODUCTS] Loading from server...');
        const response = await fetch('data/products.json?v=' + PRODUCTS_DB_VERSION);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        productsDatabase = await response.json();
        productsDatabaseLoaded = true;
        
        // Сохраняем в кэш
        try {
            localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(productsDatabase));
            localStorage.setItem(PRODUCTS_CACHE_VERSION_KEY, PRODUCTS_DB_VERSION);
            console.log(`[PRODUCTS] Loaded ${productsDatabase.length} products and cached`);
        } catch (e) {
            console.warn('[PRODUCTS] Cache save failed (quota exceeded?):', e);
            // Если localStorage переполнен, удаляем старые данные
            try {
                localStorage.removeItem('klyro_products_db');
                localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(productsDatabase));
                localStorage.setItem(PRODUCTS_CACHE_VERSION_KEY, PRODUCTS_DB_VERSION);
            } catch (e2) {
                console.error('[PRODUCTS] Failed to save cache:', e2);
            }
        }
    } catch (e) {
        console.error('[PRODUCTS] Error loading products:', e);
        productsDatabase = [];
        productsDatabaseLoaded = false;
    }
}

// Обновление кэша в фоне (без блокировки UI)
async function updateProductsCache() {
    try {
        const response = await fetch('data/products.json?v=' + PRODUCTS_DB_VERSION + '&t=' + Date.now());
        if (response.ok) {
            const freshData = await response.json();
            if (freshData.length > 0) {
                productsDatabase = freshData;
                localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(freshData));
                localStorage.setItem(PRODUCTS_CACHE_VERSION_KEY, PRODUCTS_DB_VERSION);
                console.log('[PRODUCTS] Cache updated in background');
            }
        }
    } catch (e) {
        console.warn('[PRODUCTS] Background cache update failed:', e);
    }
}

// Lazy loading: база продуктов загружается только при открытии экрана поиска
// Не загружаем при старте приложения для быстрой первой загрузки

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

async function showAddFoodScreen() {
    hideAllScreens();
    const screen = document.getElementById('add-food-screen');
    screen.classList.add('active');
    document.getElementById('food-search').value = '';
    document.getElementById('food-search').focus();
    
    // Lazy loading: загружаем базу продуктов только при открытии экрана
    if (!productsDatabaseLoaded || productsDatabase.length === 0) {
        // Показываем индикатор загрузки
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
                // Обновляем хэш
                lastDiaryHash = getDataHash(diary);
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
    // Сохраняем в localStorage для быстрого доступа
    localStorage.setItem('klyro_diary', diaryStr);
    // Обновляем хэш для отслеживания изменений
    lastDiaryHash = getDataHash(diary);
    // Сохраняем в CloudStorage для синхронизации (асинхронно, не блокируем UI)
    saveToStorage('klyro_diary', diaryStr).catch(e => {
        console.warn('[DIARY] CloudStorage save failed:', e);
    });
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

