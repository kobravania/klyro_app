/**
 * API клиент для работы с сервером
 * Источник истины = сервер (PostgreSQL)
 */

class ApiClient {
    constructor() {
        this.baseUrl = window.location.origin;
    }

    async _waitForTelegramUserId(timeoutMs = 1500) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            // Prefer initData parsing (most stable on iOS)
            const initData = this.getInitData();
            const fromInitData = this._extractTelegramUserIdFromInitData(initData || '');
            if (fromInitData) return fromInitData;

            // Fallback to initDataUnsafe.user.id
            const id = this.getTelegramUserId();
            if (id) return id;
            await new Promise(r => setTimeout(r, 50));
        }
        return null;
    }

    async _waitForInitData(timeoutMs = 1500) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const initData = this.getInitData();
            if (initData && initData.length > 0) return initData;
            await new Promise(r => setTimeout(r, 50));
        }
        return '';
    }
    _extractTelegramUserIdFromInitData(initData) {
        try {
            if (!initData) return null;
            const params = new URLSearchParams(initData);
            const userStr = params.get('user');
            if (!userStr) return null;
            const user = JSON.parse(userStr);
            if (!user || typeof user.id === 'undefined' || user.id === null) return null;
            return String(user.id);
        } catch (e) {
            return null;
        }
    }

    /**
     * Получить Telegram User ID из initData
     */
    getTelegramUserId() {
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            if (tg.initDataUnsafe && tg.initDataUnsafe.user && typeof tg.initDataUnsafe.user.id !== 'undefined') {
                return String(tg.initDataUnsafe.user.id);
            }

            // Fallback: на iOS/Telegram иногда initDataUnsafe.user может быть пустым,
            // но tg.initData содержит user=... (JSON) — достаём id оттуда.
            const fromInitData = this._extractTelegramUserIdFromInitData(tg.initData || '');
            if (fromInitData) return fromInitData;
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
        const telegramUserId = await this._waitForTelegramUserId(1500);
        if (!telegramUserId) {
            throw new Error('SERVICE_UNAVAILABLE');
        }

        const initData = await this._waitForInitData(1500);
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (initData) {
            headers['X-Telegram-Init-Data'] = initData;
        }

        // Всегда передаём telegram_user_id как fallback (даже если initData временно пуст),
        // а initData используем для валидации на backend когда оно есть.
        const url = `${this.baseUrl}/api/profile?telegram_user_id=${encodeURIComponent(telegramUserId)}`;

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
            throw error;
        }
    }

    /**
     * Сохранить профиль пользователя на сервер
     * @param {Object} profileData Данные профиля
     * @returns {Promise<Object>} Сохранённый профиль
     */
    async saveProfile(profileData) {
        const telegramUserId = await this._waitForTelegramUserId(1500);
        if (!telegramUserId) {
            throw new Error('SERVICE_UNAVAILABLE');
        }

        const initData = await this._waitForInitData(1500);
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

