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
        const telegramUserId = this.getTelegramUserId();
        if (!telegramUserId) {
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

        // Добавляем таймаут для запроса
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд таймаут

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.status === 404) {
                return null;
            }

            if (!response.ok) {
                throw new Error('SERVICE_UNAVAILABLE');
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError' || error.message === 'SERVICE_UNAVAILABLE' || error.message.includes('Failed to fetch')) {
                throw new Error('SERVICE_UNAVAILABLE');
            }
            return null;
        }
    }

    /**
     * Сохранить профиль пользователя на сервер
     * @param {Object} profileData Данные профиля
     * @returns {Promise<Object>} Сохранённый профиль
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

        // Добавляем таймаут для запроса
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error('SERVICE_UNAVAILABLE');
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('SERVICE_UNAVAILABLE');
            }
            throw error;
        }
    }
}

// Создаем глобальный экземпляр
const apiClient = new ApiClient();

// Экспортируем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiClient;
}

window.apiClient = apiClient;

