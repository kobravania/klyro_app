/**
 * Модуль хранения данных
 * Поддерживает старые ключи и новые с Telegram ID для синхронизации
 */

class StorageManager {
    constructor() {
        this.tg = null;
        this.tgReady = false;
        this.telegramUserId = null;
        this.initTelegram();
    }

    initTelegram() {
        if (window.Telegram && window.Telegram.WebApp) {
            this.tg = window.Telegram.WebApp;
            this.tg.ready();
            this.tg.expand();
            
            // Получаем Telegram User ID
            if (this.tg.initDataUnsafe && this.tg.initDataUnsafe.user) {
                this.telegramUserId = String(this.tg.initDataUnsafe.user.id);
            }
            
            // Инициализируем CloudStorage
            this.initCloudStorage();
        } else {
            this.tgReady = true; // Работаем без Telegram
        }
    }

    initCloudStorage() {
        let attempts = 0;
        const maxAttempts = 10;
        
        const checkCloudStorage = () => {
            attempts++;
            const hasCloudStorage = !!this.tg.CloudStorage;
            const hasSetItem = this.tg.CloudStorage ? typeof this.tg.CloudStorage.setItem === 'function' : false;
            const hasGetItem = this.tg.CloudStorage ? typeof this.tg.CloudStorage.getItem === 'function' : false;
            
            if (hasCloudStorage && hasSetItem && hasGetItem) {
                this.tgReady = true;
                if (typeof window.onCloudStorageReady === 'function') {
                    window.onCloudStorageReady();
                }
            } else if (attempts < maxAttempts) {
                setTimeout(checkCloudStorage, 300);
            } else {
                this.tgReady = true; // Продолжаем без CloudStorage
            }
        };
        
        checkCloudStorage();
    }

    /**
     * Получить ключ для хранения с учетом Telegram ID
     * Поддерживает старые ключи для обратной совместимости
     */
    getStorageKey(baseKey) {
        // Старые ключи остаются без изменений для обратной совместимости
        const legacyKeys = ['klyro_user_data', 'klyro_diary', 'klyro_activities', 'klyro_units', 
                           'klyro_products_db', 'klyro_products_db_version'];
        
        if (legacyKeys.includes(baseKey)) {
            return baseKey;
        }
        
        // Новые ключи с Telegram ID для синхронизации
        if (this.telegramUserId) {
            return `${baseKey}_${this.telegramUserId}`;
        }
        
        return baseKey;
    }

    /**
     * Сохранить данные
     * Сначала в localStorage, затем в CloudStorage (если доступно)
     */
    async setItem(key, value) {
        const storageKey = this.getStorageKey(key);
        const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
        
        console.log('[STORAGE] setItem:', { key, storageKey, valueLength: valueStr.length });
        
        // ВСЕГДА сохраняем в localStorage первым делом
        try {
            localStorage.setItem(storageKey, valueStr);
            console.log('[STORAGE] Данные сохранены в localStorage, ключ:', storageKey);
            
            // Проверяем, что данные действительно сохранились
            const checkValue = localStorage.getItem(storageKey);
            if (checkValue === valueStr) {
                console.log('[STORAGE] ✅ Данные успешно сохранены и проверены');
            } else {
                console.error('[STORAGE] ❌ ОШИБКА: Данные не совпадают после сохранения!');
            }
        } catch (e) {
            console.error('[STORAGE] localStorage.setItem error:', e);
            throw e;
        }
        
        // Синхронизируем в CloudStorage в фоне (не блокируем)
        if (this.tgReady && this.tg && this.tg.CloudStorage && typeof this.tg.CloudStorage.setItem === 'function') {
            setTimeout(() => {
                try {
                    this.tg.CloudStorage.setItem(storageKey, valueStr);
                    console.log('[STORAGE] Данные синхронизированы в CloudStorage');
                } catch (e) {
                    // Игнорируем ошибки CloudStorage - данные уже в localStorage
                }
            }, 0);
        }
        
        return true;
    }

    /**
     * Загрузить данные
     * Сначала из CloudStorage, затем из localStorage (fallback)
     */
    async getItem(key) {
        const storageKey = this.getStorageKey(key);
        
        console.log('[STORAGE] getItem:', { key, storageKey });
        
        // Пробуем загрузить из CloudStorage
        if (this.tgReady && this.tg && this.tg.CloudStorage && typeof this.tg.CloudStorage.getItem === 'function') {
            try {
                const cloudValue = await Promise.race([
                    this.tg.CloudStorage.getItem(storageKey),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                ]);
                
                if (cloudValue) {
                    console.log('[STORAGE] Данные загружены из CloudStorage');
                    // Обновляем localStorage из CloudStorage
                    localStorage.setItem(storageKey, cloudValue);
                    return cloudValue;
                }
            } catch (e) {
                console.log('[STORAGE] CloudStorage недоступен, используем localStorage');
                // Игнорируем ошибки CloudStorage, используем localStorage
            }
        }
        
        // Fallback на localStorage
        const localValue = localStorage.getItem(storageKey);
        console.log('[STORAGE] Значение из localStorage:', localValue ? 'есть (длина: ' + localValue.length + ')' : 'нет');
        return localValue;
    }

    /**
     * Синхронная загрузка из localStorage (для быстрого доступа)
     */
    getItemSync(key) {
        const storageKey = this.getStorageKey(key);
        return localStorage.getItem(storageKey);
    }

    /**
     * Удалить данные
     */
    removeItem(key) {
        const storageKey = this.getStorageKey(key);
        localStorage.removeItem(storageKey);
        
        if (this.tgReady && this.tg && this.tg.CloudStorage && typeof this.tg.CloudStorage.removeItem === 'function') {
            setTimeout(() => {
                try {
                    this.tg.CloudStorage.removeItem(storageKey);
                } catch (e) {
                    // Игнорируем ошибки
                }
            }, 0);
        }
    }

    /**
     * Экспорт всех данных пользователя
     */
    exportUserData() {
        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            telegramUserId: this.telegramUserId,
            userData: null,
            diary: null,
            activities: null,
            settings: null
        };
        
        // Экспортируем старые ключи
        const userDataStr = this.getItemSync('klyro_user_data');
        if (userDataStr) {
            try {
                data.userData = JSON.parse(userDataStr);
            } catch (e) {
                console.error('[EXPORT] Error parsing userData:', e);
            }
        }
        
        const diaryStr = this.getItemSync('klyro_diary');
        if (diaryStr) {
            try {
                data.diary = JSON.parse(diaryStr);
            } catch (e) {
                console.error('[EXPORT] Error parsing diary:', e);
            }
        }
        
        const activitiesStr = this.getItemSync('klyro_activities');
        if (activitiesStr) {
            try {
                data.activities = JSON.parse(activitiesStr);
            } catch (e) {
                console.error('[EXPORT] Error parsing activities:', e);
            }
        }
        
        const units = this.getItemSync('klyro_units');
        if (units) {
            data.settings = { units: units };
        }
        
        return JSON.stringify(data, null, 2);
    }

    /**
     * Импорт данных пользователя
     */
    async importUserData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (data.userData) {
                await this.setItem('klyro_user_data', JSON.stringify(data.userData));
            }
            
            if (data.diary) {
                await this.setItem('klyro_diary', JSON.stringify(data.diary));
            }
            
            if (data.activities) {
                await this.setItem('klyro_activities', JSON.stringify(data.activities));
            }
            
            if (data.settings && data.settings.units) {
                await this.setItem('klyro_units', data.settings.units);
            }
            
            return true;
        } catch (e) {
            console.error('[IMPORT] Error:', e);
            throw new Error('Ошибка при импорте данных: ' + e.message);
        }
    }

    /**
     * Получить Telegram User ID
     */
    getTelegramUserId() {
        return this.telegramUserId;
    }
}

// Создаем глобальный экземпляр
const storage = new StorageManager();

// Экспортируем для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}

// Экспортируем в глобальную область
window.storage = storage;

