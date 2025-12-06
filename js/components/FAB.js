/**
 * Компонент FAB (Floating Action Button) для добавления приёма пищи
 */

class FAB {
    constructor() {
        this.init();
    }

    init() {
        // Создаем FAB кнопку
        const fabHTML = `
            <button class="fab" id="fab-add-food" aria-label="Добавить приём пищи">
                <svg class="fab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
            </button>
        `;

        // Добавляем в body
        const fabContainer = document.createElement('div');
        fabContainer.innerHTML = fabHTML;
        document.body.appendChild(fabContainer.firstElementChild);

        // Добавляем обработчик
        const fab = document.getElementById('fab-add-food');
        if (fab) {
            fab.addEventListener('click', () => {
                this.onClick();
            });
        }
    }

    onClick() {
        // Вызываем событие открытия экрана добавления продукта
        window.dispatchEvent(new CustomEvent('showAddFood'));
    }

    show() {
        const fab = document.getElementById('fab-add-food');
        if (fab) {
            fab.style.display = 'flex';
        }
    }

    hide() {
        const fab = document.getElementById('fab-add-food');
        if (fab) {
            fab.style.display = 'none';
        }
    }
}

// Создаем глобальный экземпляр
const fab = new FAB();

// Экспортируем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FAB;
}

