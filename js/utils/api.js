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
                const userId = tg.initDataUnsafe.user.id;
                console.log('[API] Telegram User ID:', userId);
                return String(userId); // Преобразуем в строку для консистентности
            } else {
                console.warn('[API] initDataUnsafe.user не найден:', {
                    hasInitDataUnsafe: !!tg.initDataUnsafe,
                    initDataUnsafe: tg.initDataUnsafe
                });
            }
        } else {
            console.warn('[API] Telegram WebApp API не найден');
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
            console.error('[API] getProfile: telegram_user_id не найден');
            throw new Error('SERVICE_UNAVAILABLE');
        }

        const initData = this.getInitData();
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (initData) {
            headers['X-Telegram-Init-Data'] = initData;
        }

        const url = `${this.baseUrl}/api/profile?telegram_user_id=${telegramUserId}`;
        console.log('[API] GET /api/profile, URL:', url);

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
            console.log('[API] GET /api/profile response status:', response.status);

            if (response.status === 404) {
                console.log('[API] Профиль не найден (404)');
                return null;
            }

            if (!response.ok) {
                console.error('[API] GET /api/profile failed:', response.status, response.statusText);
                throw new Error('SERVICE_UNAVAILABLE');
            }

            const profile = await response.json();
            console.log('[API] Профиль загружен:', profile);
            return profile;
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('[API] GET /api/profile error:', error);
            if (error.name === 'AbortError' || error.message === 'SERVICE_UNAVAILABLE' || error.message.includes('Failed to fetch')) {
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
        const telegramUserId = this.getTelegramUserId();
        if (!telegramUserId) {
            console.error('[API] saveProfile: telegram_user_id не найден');
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
        console.log('[API] POST /api/profile, URL:', url, 'Payload:', payload);

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
            console.log('[API] POST /api/profile response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[API] POST /api/profile failed:', response.status, response.statusText, errorText);
                throw new Error('SERVICE_UNAVAILABLE');
            }

            const result = await response.json();
            console.log('[API] Профиль сохранён:', result);
            return result;
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('[API] POST /api/profile error:', error);
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

