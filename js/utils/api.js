/**
 * API клиент для работы с сервером
 * Источник истины = сервер (PostgreSQL)
 */

class ApiClient {
    constructor() {
        this.baseUrl = window.location.origin;
        this.sessionToken = this._getSessionTokenFromUrl();
    }

    _getSessionTokenFromUrl() {
        try {
            // 1) Query param (?session_token=...)
            const params = new URLSearchParams(window.location.search || '');
            const q = (params.get('session_token') || '').trim();
            if (q) return q;

            // 2) Fragment (#session_token=...) — more reliable in Telegram clients
            const hash = (window.location.hash || '').replace(/^#/, '');
            const hparams = new URLSearchParams(hash);
            const h = (hparams.get('session_token') || '').trim();
            return h || null;
        } catch (e) {
            return null;
        }
    }

    _requireSession() {
        if (!this.sessionToken) {
            const err = new Error('AUTH_REQUIRED');
            err.code = 'AUTH_REQUIRED';
            throw err;
        }
    }

    /**
     * Загрузить профиль пользователя с сервера
     * @returns {Promise<Object|null>} Профиль пользователя или null если не найден
     */
    async getProfile() {
        this._requireSession();
        const headers = {
            'Content-Type': 'application/json'
        };

        headers['X-Session-Token'] = this.sessionToken;
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
        this._requireSession();
        const headers = {
            'Content-Type': 'application/json'
        };

        headers['X-Session-Token'] = this.sessionToken;
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

