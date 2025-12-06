/**
 * Компонент экспорта/импорта данных
 */

class ExportImport {
    constructor() {
        this.init();
    }

    init() {
        // Компонент будет использоваться в настройках
    }

    /**
     * Экспорт всех данных пользователя
     */
    async exportData() {
        try {
            const data = storage.exportUserData();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `klyro_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            Helpers.showNotification('Данные успешно экспортированы', 'success');
            return true;
        } catch (e) {
            console.error('[EXPORT] Error:', e);
            Helpers.showNotification('Ошибка при экспорте данных', 'error');
            return false;
        }
    }

    /**
     * Импорт данных пользователя
     */
    async importData(file) {
        try {
            const text = await file.text();
            await storage.importUserData(text);
            
            // Перезагружаем контекст
            await appContext.init();
            
            Helpers.showNotification('Данные успешно импортированы', 'success');
            
            // Перезагружаем страницу для применения изменений
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            
            return true;
        } catch (e) {
            console.error('[IMPORT] Error:', e);
            Helpers.showNotification('Ошибка при импорте данных: ' + e.message, 'error');
            return false;
        }
    }

    /**
     * Создать UI для экспорта/импорта
     */
    createUI() {
        return `
            <div class="export-import-section">
                <h3 class="section-title">Резервное копирование</h3>
                <div class="export-import-buttons">
                    <button class="btn btn-primary" id="export-btn">
                        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Экспорт данных
                    </button>
                    <label class="btn btn-secondary" for="import-input">
                        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        Импорт данных
                        <input type="file" id="import-input" accept=".json" style="display: none;">
                    </label>
                </div>
                <p class="export-import-hint">
                    Экспортируйте данные для резервного копирования или переноса на другое устройство
                </p>
            </div>
        `;
    }

    /**
     * Привязать обработчики событий
     */
    attachHandlers(container) {
        const exportBtn = container.querySelector('#export-btn');
        const importInput = container.querySelector('#import-input');
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }
        
        if (importInput) {
            importInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.importData(file);
                }
            });
        }
    }
}

// Создаем глобальный экземпляр
const exportImport = new ExportImport();

// Экспортируем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExportImport;
}

