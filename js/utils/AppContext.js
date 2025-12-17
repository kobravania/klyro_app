/**
 * Глобальный контекст приложения
 * Централизованное управление состоянием
 */

class AppContext {
    constructor() {
        this.userData = null;
        this.diary = {};
        this.activities = [];
        this.settings = {
            units: 'metric'
        };
        this.productsDatabase = [];
        this.productsLoaded = false;
        this.currentScreen = null;
        this.currentDiaryDate = null;
        
        // Подписчики на изменения
        this.listeners = {
            userData: [],
            diary: [],
            activities: [],
            settings: []
        };
    }

    /**
     * Инициализация - загрузка данных из хранилища
     */
    async init() {
        await this.loadData();
    }

    /**
     * Загрузка всех данных из хранилища
     */
    async loadData() {
        console.log('[CONTEXT] ========== ЗАГРУЗКА ДАННЫХ ==========');
        console.log('[CONTEXT] НОВАЯ АРХИТЕКТУРА: Сервер = источник истины');
        
        // ШАГ 1: Загружаем профиль с СЕРВЕРА (источник истины)
        let userData = null;
        
        if (typeof apiClient !== 'undefined') {
            try {
                console.log('[CONTEXT] Запрос профиля с сервера...');
                userData = await apiClient.getProfile();
                
                if (userData) {
                    console.log('[CONTEXT] ✅ Профиль загружен с сервера:', userData);
                    // Сохраняем в localStorage как кэш
                    try {
                        localStorage.setItem('klyro_user_data', JSON.stringify(userData));
                        console.log('[CONTEXT] Профиль сохранен в localStorage как кэш');
                    } catch (e) {
                        console.warn('[CONTEXT] Не удалось сохранить в localStorage (не критично):', e);
                    }
                } else {
                    console.log('[CONTEXT] Профиль не найден на сервере');
                }
            } catch (error) {
                console.error('[CONTEXT] Ошибка при загрузке профиля с сервера:', error);
                // Продолжаем - попробуем загрузить из кэша
            }
        } else {
            console.warn('[CONTEXT] apiClient не доступен, пропускаем загрузку с сервера');
        }
        
        // ШАГ 2: Если не нашли на сервере, пробуем загрузить из localStorage (только как fallback)
        if (!userData) {
            console.log('[CONTEXT] Загрузка из localStorage (fallback)...');
            let userDataStr = null;
            
            try {
                userDataStr = localStorage.getItem('klyro_user_data');
                if (userDataStr) {
                    userData = JSON.parse(userDataStr);
                    console.log('[CONTEXT] Профиль загружен из localStorage (fallback):', userData);
                }
            } catch (e) {
                console.error('[CONTEXT] Ошибка при загрузке из localStorage:', e);
            }
        }
        
        // Устанавливаем загруженные данные
        if (userData && typeof userData === 'object' && !Array.isArray(userData)) {
            this.userData = userData;
            console.log('[CONTEXT] ✅ userData установлен:', {
                dateOfBirth: this.userData.dateOfBirth,
                age: this.userData.age,
                gender: this.userData.gender,
                height: this.userData.height,
                weight: this.userData.weight,
                activity: this.userData.activity,
                goal: this.userData.goal
            });
            console.log('[CONTEXT] hasCompleteProfile:', this.hasCompleteProfile());
        } else {
            console.log('[CONTEXT] ⚠️ userData не найден или невалиден');
            this.userData = null;
        }
        
        console.log('[CONTEXT] ======================================');

        // Загружаем дневник
        const diaryStr = await storage.getItem('klyro_diary');
        if (diaryStr) {
            try {
                this.diary = JSON.parse(diaryStr);
            } catch (e) {
                console.error('[CONTEXT] Error parsing diary:', e);
                this.diary = {};
            }
        }

        // Загружаем активности
        const activitiesStr = await storage.getItem('klyro_activities');
        if (activitiesStr) {
            try {
                this.activities = JSON.parse(activitiesStr);
            } catch (e) {
                console.error('[CONTEXT] Error parsing activities:', e);
                this.activities = [];
            }
        }

        // Загружаем настройки
        const units = storage.getItemSync('klyro_units');
        if (units) {
            this.settings.units = units;
        }

        // Устанавливаем текущую дату
        this.currentDiaryDate = Helpers.getToday();
    }

    /**
     * Обновить данные пользователя
     */
    async setUserData(userData) {
        console.log('[CONTEXT] setUserData вызван с данными:', userData);
        console.log('[CONTEXT] Тип данных:', typeof userData);
        console.log('[CONTEXT] Это объект?', userData && typeof userData === 'object' && !Array.isArray(userData));
        
        // Проверяем, что это объект
        if (!userData || typeof userData !== 'object' || Array.isArray(userData)) {
            throw new Error('userData должен быть объектом');
        }
        
        this.userData = userData;
        
        // storage.setItem сам делает JSON.stringify, передаем объект напрямую
        console.log('[CONTEXT] Сохраняем в storage (объект)');
        
        try {
            await storage.setItem('klyro_user_data', userData);
            console.log('[CONTEXT] ✅ Данные успешно сохранены');
        } catch (error) {
            console.error('[CONTEXT] ❌ Ошибка при сохранении:', error);
            throw error;
        }
        
        // Проверяем, что данные действительно сохранились
        const savedStr = await storage.getItem('klyro_user_data');
        if (savedStr) {
            const savedData = JSON.parse(savedStr);
            console.log('[CONTEXT] Данные успешно сохранены и проверены:', savedData);
        } else {
            console.error('[CONTEXT] ОШИБКА: Данные не сохранились!');
        }
        
        this.notifyListeners('userData', userData);
    }

    /**
     * Получить данные пользователя
     */
    getUserData() {
        return this.userData;
    }

    /**
     * Проверить, есть ли полный профиль
     */
    hasCompleteProfile() {
        if (!this.userData) {
            console.log('[CONTEXT] hasCompleteProfile: userData отсутствует');
            return false;
        }
        
        // Проверяем минимально необходимые поля для расчета калорий
        const hasDate = !!(this.userData.dateOfBirth || this.userData.age);
        const hasHeight = !!this.userData.height && this.userData.height > 0;
        const hasGender = !!this.userData.gender;
        const hasWeight = !!this.userData.weight && this.userData.weight > 0;
        
        // activity и goal могут быть не обязательными для базового профиля
        // но если они есть, проверяем их
        const hasActivity = !!this.userData.activity;
        const hasGoal = !!this.userData.goal;
        
        // Для полного профиля нужны: дата рождения, рост, пол, вес
        // activity и goal желательны, но не критичны
        const isComplete = hasDate && hasHeight && hasGender && hasWeight;
        
        console.log('[CONTEXT] hasCompleteProfile проверка:', {
            hasDate,
            hasHeight,
            hasGender,
            hasWeight,
            hasActivity,
            hasGoal,
            isComplete,
            userDataKeys: Object.keys(this.userData),
            userData: this.userData
        });
        
        return isComplete;
    }

    /**
     * Обновить дневник
     */
    async setDiary(diary) {
        this.diary = diary;
        await storage.setItem('klyro_diary', JSON.stringify(diary));
        this.notifyListeners('diary', diary);
    }

    /**
     * Добавить запись в дневник
     */
    async addDiaryEntry(date, entry) {
        if (!this.diary[date]) {
            this.diary[date] = [];
        }
        this.diary[date].push(entry);
        await this.setDiary(this.diary);
    }

    /**
     * Удалить запись из дневника
     */
    async removeDiaryEntry(date, entryId) {
        if (this.diary[date]) {
            this.diary[date] = this.diary[date].filter(item => item.id !== entryId);
            await this.setDiary(this.diary);
        }
    }

    /**
     * Получить записи дневника за дату
     */
    getDiaryForDate(date) {
        return this.diary[date] || [];
    }

    /**
     * Получить целевые калории
     */
    getGoalCalories() {
        if (!this.hasCompleteProfile()) {
            console.warn('[CONTEXT] getGoalCalories: профиль не полный');
            return 0;
        }
        if (!this.userData) {
            console.warn('[CONTEXT] getGoalCalories: userData отсутствует');
            return 0;
        }
        if (typeof Calculations === 'undefined' || !Calculations.calculateCalories) {
            console.error('[CONTEXT] getGoalCalories: Calculations не загружен!');
            return 0;
        }
        const calories = Calculations.calculateCalories(this.userData);
        console.log('[CONTEXT] getGoalCalories result:', calories);
        return calories;
    }

    /**
     * Получить прогресс за день
     */
    getDayProgress(date) {
        const entries = this.getDiaryForDate(date);
        console.log('[CONTEXT] getDayProgress for', date, 'entries:', entries.length);
        if (typeof Calculations === 'undefined' || !Calculations.calculateDayProgress) {
            console.error('[CONTEXT] getDayProgress: Calculations не загружен!');
            return { kcal: 0, protein: 0, fat: 0, carbs: 0 };
        }
        const progress = Calculations.calculateDayProgress(entries);
        console.log('[CONTEXT] getDayProgress result:', progress);
        return progress;
    }

    /**
     * Подписаться на изменения
     */
    subscribe(type, callback) {
        if (!this.listeners[type]) {
            this.listeners[type] = [];
        }
        this.listeners[type].push(callback);
        
        // Возвращаем функцию отписки
        return () => {
            this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
        };
    }

    /**
     * Уведомить подписчиков
     */
    notifyListeners(type, data) {
        if (this.listeners[type]) {
            this.listeners[type].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error('[CONTEXT] Listener error:', e);
                }
            });
        }
    }

    /**
     * Загрузить базу продуктов
     */
    async loadProducts() {
        if (this.productsLoaded && this.productsDatabase.length > 0) {
            return;
        }

        try {
            const cachedVersion = storage.getItemSync('klyro_products_db_version');
            const cachedData = storage.getItemSync('klyro_products_db');
            const PRODUCTS_DB_VERSION = '1.0';

            if (cachedVersion === PRODUCTS_DB_VERSION && cachedData) {
                try {
                    this.productsDatabase = JSON.parse(cachedData);
                    this.productsLoaded = true;
                    return;
                } catch (e) {
                    storage.removeItem('klyro_products_db');
                    storage.removeItem('klyro_products_db_version');
                }
            }

            const response = await fetch('data/products.json?v=' + PRODUCTS_DB_VERSION);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.productsDatabase = await response.json();
            this.productsLoaded = true;

            try {
                await storage.setItem('klyro_products_db', JSON.stringify(this.productsDatabase));
                await storage.setItem('klyro_products_db_version', PRODUCTS_DB_VERSION);
            } catch (e) {
                console.error('[CONTEXT] Error caching products:', e);
            }
        } catch (e) {
            console.error('[CONTEXT] Error loading products:', e);
            this.productsDatabase = [];
            this.productsLoaded = false;
        }
    }

    /**
     * Найти продукт по ID
     */
    findProduct(productId) {
        return this.productsDatabase.find(p => p.id === String(productId));
    }

    /**
     * Поиск продуктов
     */
    searchProducts(query) {
        if (!query) return [];
        const lowerQuery = query.toLowerCase();
        return this.productsDatabase.filter(product => 
            product.name.toLowerCase().includes(lowerQuery)
        );
    }
}

// Создаем глобальный экземпляр
const appContext = new AppContext();

// Экспортируем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppContext;
}

// Экспортируем в глобальную область
window.appContext = appContext;

