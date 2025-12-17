/**
 * API клиент для работы с сервером
 * Источник истины = сервер (PostgreSQL)
 */

class ApiClient {
    constructor() {
        this.baseUrl = window.location.origin;
    }

    /**
     * Получить Telegram User ID из initData
     */
    getTelegramUserId() {
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                return tg.initDataUnsafe.user.id;
            }
        }
        return null;
    }

    /**
     * Получить initData для отправки на сервер
     */
    getInitData() {
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            return tg.initData || '';
        }
        return '';
    }

    /**
     * Загрузить профиль пользователя с сервера
     * @returns {Promise<Object|null>} Профиль пользователя или null если не найден
     */
    async getProfile() {
        try {
            const telegramUserId = this.getTelegramUserId();
            if (!telegramUserId) {
                console.error('[API] Telegram User ID не найден');
                return null;
            }

            const initData = this.getInitData();
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (initData) {
                headers['X-Telegram-Init-Data'] = initData;
            }

            const url = `${this.baseUrl}/api/profile?telegram_user_id=${telegramUserId}`;
            console.log('[API] Запрос профиля:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });

            if (response.status === 404) {
                console.log('[API] Профиль не найден на сервере');
                return null;
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('[API] Ошибка при загрузке профиля:', error);
                throw new Error(error.error || 'Failed to load profile');
            }

            const profile = await response.json();
            console.log('[API] Профиль загружен с сервера:', profile);
            return profile;
        } catch (error) {
            console.error('[API] Ошибка при запросе профиля:', error);
            return null;
        }
    }

    /**
     * Сохранить профиль пользователя на сервер
     * @param {Object} profileData Данные профиля
     * @returns {Promise<boolean>} true если успешно сохранено
     */
    async saveProfile(profileData) {
        const telegramUserId = this.getTelegramUserId();
        if (!telegramUserId) {
            throw new Error('SERVICE_UNAVAILABLE');
        }

        const initData = this.getInitData();
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (initData) {
            headers['X-Telegram-Init-Data'] = initData;
        }

        const payload = {
            telegram_user_id: telegramUserId,
            ...profileData
        };

        const url = `${this.baseUrl}/api/profile`;

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('SERVICE_UNAVAILABLE');
        }

        return true;
    }
}

// Создаем глобальный экземпляр
const apiClient = new ApiClient();

// Экспортируем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiClient;
}

window.apiClient = apiClient;

