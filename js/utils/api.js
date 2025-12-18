/**
 * API клиент для работы с сервером
 * Источник истины = сервер (PostgreSQL)
 */

class ApiClient {
    constructor() {
        this.baseUrl = window.location.origin;
    }

    async _waitForInitData(timeoutMs = 5000) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const initData = this.getInitData();
            if (initData && initData.length > 0) return initData;
            await new Promise(r => setTimeout(r, 50));
        }
        return '';
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
        const initData = await this._waitForInitData(5000);
        if (!initData) {
            throw new Error('SERVICE_UNAVAILABLE');
        }
        const headers = {
            'Content-Type': 'application/json'
        };
        
        headers['X-Telegram-Init-Data'] = initData;
        const url = `${this.baseUrl}/api/profile`;

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

            if (response.status === 401) {
                const err = new Error('AUTH_REQUIRED');
                err.code = 'AUTH_REQUIRED';
                throw err;
            }

            if (!response.ok) {
                throw new Error('SERVICE_UNAVAILABLE');
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.code === 'AUTH_REQUIRED') {
                throw error;
            }
            if (error.name === 'AbortError' || error.message === 'SERVICE_UNAVAILABLE' || (error.message && error.message.includes('Failed to fetch'))) {
                throw new Error('SERVICE_UNAVAILABLE');
            }
            throw error;
        }
    }

    /**
     * Сохранить профиль пользователя на сервер
     * @param {Object} profileData Данные профиля
     * @returns {Promise<Object>} Сохранённый профиль
     */
    async saveProfile(profileData) {
        const initData = await this._waitForInitData(5000);
        if (!initData) {
            throw new Error('SERVICE_UNAVAILABLE');
        }
        const headers = {
            'Content-Type': 'application/json'
        };
        
        headers['X-Telegram-Init-Data'] = initData;
        const payload = { ...profileData };

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

