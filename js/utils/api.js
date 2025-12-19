/**
 * API клиент для работы с сервером
 * Session-based: только через X-Klyro-Session header
 */

class ApiClient {
    constructor() {
        this.baseUrl = window.location.origin;
    }

    /**
     * Получить session_id из start_param
     * Единственный источник session_id = Telegram.WebApp.initDataUnsafe.start_param
     */
    getSessionId() {
        try {
            if (window.Telegram && window.Telegram.WebApp) {
                const tg = window.Telegram.WebApp;
                const initDataUnsafe = tg.initDataUnsafe || {};
                return initDataUnsafe.start_param || '';
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
        const sessionId = this.getSessionId();
        if (!sessionId) {
            throw new Error('AUTH_REQUIRED');
        }

        const headers = {
            'Content-Type': 'application/json',
            'X-Klyro-Session': sessionId
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
        const sessionId = this.getSessionId();
        if (!sessionId) {
            throw new Error('AUTH_REQUIRED');
        }

        const headers = {
            'Content-Type': 'application/json',
            'X-Klyro-Session': sessionId
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
