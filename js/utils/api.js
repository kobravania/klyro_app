/**
 * API клиент для работы с сервером
 * InitData-based: только через X-Telegram-Init-Data header
 */

class ApiClient {
    constructor() {
        this.baseUrl = window.location.origin;
    }

    /**
     * Ожидание готовности Telegram.WebApp.initData
     * Гарантированное ожидание до 5 секунд
     */
    async _waitForInitData(maxWaitMs = 5000) {
        const startTime = Date.now();
        while (Date.now() - startTime < maxWaitMs) {
            if (window.Telegram && window.Telegram.WebApp) {
                const tg = window.Telegram.WebApp;
                if (tg.initData && tg.initData.length > 0) {
                    return true;
                }
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return false;
    }

    /**
     * Получить initData строку
     * Единственный источник = Telegram.WebApp.initData
     */
    getInitData() {
        try {
            if (window.Telegram && window.Telegram.WebApp) {
                const tg = window.Telegram.WebApp;
                return tg.initData || '';
            }
            return '';
        } catch (e) {
            return '';
        }
    }

    /**
     * Загрузить профиль пользователя с сервера
     * @returns {Promise<Object|null>} Профиль пользователя или null если не найден
     * @throws {Error} 'AUTH_REQUIRED' если 401, 'SERVICE_UNAVAILABLE' если 500
     */
    async getProfile() {
        // ОБЯЗАТЕЛЬНО: ждем готовности initData перед запросом
        const initDataReady = await this._waitForInitData(5000);
        if (!initDataReady) {
            throw new Error('AUTH_REQUIRED');
        }

        const initData = this.getInitData();
        if (!initData) {
            throw new Error('AUTH_REQUIRED');
        }

        const headers = {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': initData
        };

        const url = `${this.baseUrl}/api/profile`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.status === 401) {
                throw new Error('AUTH_REQUIRED');
            }

            if (response.status === 404) {
                return null;
            }

            if (!response.ok) {
                throw new Error('SERVICE_UNAVAILABLE');
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
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
     * @throws {Error} 'AUTH_REQUIRED' если 401, 'SERVICE_UNAVAILABLE' если 500
     */
    async saveProfile(profileData) {
        // ОБЯЗАТЕЛЬНО: ждем готовности initData перед запросом
        const initDataReady = await this._waitForInitData(5000);
        if (!initDataReady) {
            throw new Error('AUTH_REQUIRED');
        }

        const initData = this.getInitData();
        if (!initData) {
            throw new Error('AUTH_REQUIRED');
        }

        const headers = {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': initData
        };

        const payload = { ...profileData };

        const url = `${this.baseUrl}/api/profile`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.status === 401) {
                throw new Error('AUTH_REQUIRED');
            }

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
