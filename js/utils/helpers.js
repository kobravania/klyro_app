/**
 * Вспомогательные утилиты
 */

class Helpers {
    /**
     * Форматировать дату в формат YYYY-MM-DD
     */
    static formatDate(date) {
        if (!date) return null;
        const d = date instanceof Date ? date : new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Получить сегодняшнюю дату в формате YYYY-MM-DD
     */
    static getToday() {
        return this.formatDate(new Date());
    }

    /**
     * Форматировать дату для отображения
     */
    static formatDateDisplay(date, locale = 'ru-RU') {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleDateString(locale, { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
    }

    /**
     * Форматировать время для отображения
     */
    static formatTime(date, locale = 'ru-RU') {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleTimeString(locale, { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    /**
     * Получить возраст из даты рождения
     */
    static getAge(dateOfBirth) {
        if (!dateOfBirth) return null;
        const birthDate = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    /**
     * Показать уведомление
     */
    static showNotification(message, type = 'info', duration = 3000) {
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
            color: white;
            padding: 12px 24px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
            animation: slideDown 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Удаляем через duration
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, duration);
    }

    /**
     * Дебаунс функция
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Проверить, является ли значение валидным числом
     */
    static isValidNumber(value) {
        return value !== null && value !== undefined && !isNaN(value) && value > 0;
    }

    /**
     * Округлить число
     */
    static round(value, decimals = 0) {
        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }
}

// Добавляем CSS анимации для уведомлений
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }
        @keyframes slideUp {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-20px);
            }
        }
    `;
    document.head.appendChild(style);
}

// Экспортируем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Helpers;
}

// Экспортируем в глобальную область
window.Helpers = Helpers;

