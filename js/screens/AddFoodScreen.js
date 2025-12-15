/**
 * Экран добавления продукта - Bottom Sheet в стиле iOS
 */

class AddFoodScreen {
    constructor() {
        this.selectedProduct = null;
        this.searchQuery = '';
        this.init();
    }

    init() {
        this.createHTML();
        this.attachHandlers();
    }

    createHTML() {
        // Overlay
        const overlay = document.createElement('div');
        overlay.className = 'bottom-sheet-overlay';
        overlay.id = 'add-food-overlay';
        document.body.appendChild(overlay);

        // Bottom Sheet
        const sheet = document.createElement('div');
        sheet.className = 'bottom-sheet';
        sheet.id = 'add-food-sheet';
        sheet.innerHTML = `
            <div class="bottom-sheet-handle"></div>
            <div class="bottom-sheet-header">
                <h2 class="bottom-sheet-title">Добавить продукт</h2>
                <button class="btn-icon" id="add-food-close">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="bottom-sheet-content">
                <div class="search-wrapper">
                    <input type="text" 
                           id="product-search" 
                           class="search-input" 
                           placeholder="Поиск продукта..."
                           autocomplete="off">
                </div>
                
                <div id="products-list" class="products-list">
                    <p class="empty-state">Загрузка продуктов...</p>
                </div>
                
                <div id="product-amount-section" class="product-amount-section" style="display: none;">
                    <div class="card">
                        <div class="selected-product-info">
                            <div class="product-name" id="selected-product-name" style="font-size: 20px; font-weight: 600; margin-bottom: var(--spacing-sm);"></div>
                            <div class="product-macros" id="selected-product-macros" style="display: flex; gap: var(--spacing-md); font-size: 14px; color: var(--text-secondary);"></div>
                        </div>
                        
                        <div class="amount-input-group" style="margin-top: var(--spacing-lg);">
                            <label class="input-label">Количество (граммы)</label>
                            <input type="number" 
                                   id="product-grams" 
                                   class="input" 
                                   value="100" 
                                   min="1" 
                                   step="1"
                                   style="font-size: 24px; text-align: center; font-family: var(--font-mono);">
                        </div>
                        
                        <div class="calculated-macros" id="calculated-macros" style="margin-top: var(--spacing-lg); padding: var(--spacing-md); background: var(--bg-elevated); border-radius: var(--radius-md);"></div>
                        
                        <button class="btn btn-primary btn-block" id="add-to-diary-btn" style="margin-top: var(--spacing-lg);">
                            Добавить в дневник
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(sheet);
    }

    attachHandlers() {
        const closeBtn = document.getElementById('add-food-close');
        const overlay = document.getElementById('add-food-overlay');
        const searchInput = document.getElementById('product-search');
        const gramsInput = document.getElementById('product-grams');
        const addBtn = document.getElementById('add-to-diary-btn');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        if (overlay) {
            overlay.addEventListener('click', () => this.hide());
        }

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.updateProductsList();
            });
        }

        if (gramsInput) {
            gramsInput.addEventListener('input', () => {
                this.updateCalculatedMacros();
            });
        }

        if (addBtn) {
            addBtn.addEventListener('click', () => this.addToDiary());
        }
    }

    hapticFeedback(type = 'light') {
        if (window.Telegram?.WebApp?.HapticFeedback) {
            try {
                window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
            } catch (e) {}
        }
    }

    async show() {
        const sheet = document.getElementById('add-food-sheet');
        const overlay = document.getElementById('add-food-overlay');
        const searchInput = document.getElementById('product-search');

        if (!sheet || !overlay) return;

        // Загружаем продукты
        await appContext.loadProducts();

        // Сбрасываем состояние
        this.selectedProduct = null;
        this.searchQuery = '';
        if (searchInput) searchInput.value = '';
        
        const amountSection = document.getElementById('product-amount-section');
        if (amountSection) amountSection.style.display = 'none';

        // Показываем
        overlay.classList.add('active');
        sheet.classList.add('active');
        
        // Фокус на поиск
        setTimeout(() => {
            if (searchInput) {
                searchInput.focus();
            }
        }, 300);

        this.updateProductsList();
        this.hapticFeedback('light');
    }

    hide() {
        const sheet = document.getElementById('add-food-sheet');
        const overlay = document.getElementById('add-food-overlay');
        const searchInput = document.getElementById('product-search');

        if (sheet) sheet.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        if (searchInput) searchInput.blur();

        this.hapticFeedback('light');
    }

    updateProductsList() {
        const listEl = document.getElementById('products-list');
        if (!listEl) {
            console.error('[ADDFOOD] products-list element not found!');
            return;
        }

        let products = appContext.productsDatabase || [];
        
        console.log('[ADDFOOD] Products in database:', products.length);
        
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            products = products.filter(p => 
                (p.name || '').toLowerCase().includes(query)
            );
            console.log('[ADDFOOD] Filtered products:', products.length);
        }

        if (products.length === 0) {
            if (appContext.productsDatabase.length === 0) {
                listEl.innerHTML = '<p class="empty-state">Загрузка продуктов...</p>';
                // Пробуем загрузить еще раз
                appContext.loadProducts().then(() => {
                    this.updateProductsList();
                });
            } else {
                listEl.innerHTML = '<p class="empty-state">Продукты не найдены</p>';
            }
            return;
        }

        listEl.innerHTML = products.slice(0, 50).map(product => `
            <div class="product-item" data-product-id="${product.id || product.name}">
                <div>
                    <div class="product-name">${product.name || 'Продукт'}</div>
                    <div class="product-kcal">${Math.round(product.kcal || 0)} ккал / 100г</div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px; opacity: 0.5;">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>
            </div>
        `).join('');

        // Обработчики выбора продукта - используем делегирование событий
        listEl.addEventListener('click', (e) => {
            const productItem = e.target.closest('.product-item');
            if (productItem) {
                const productId = productItem.dataset.productId;
                console.log('[ADDFOOD] Product clicked:', productId);
                this.selectProduct(productId);
            }
        });
    }

    selectProduct(productId) {
        console.log('[ADDFOOD] Selecting product:', productId);
        const product = appContext.findProduct(productId);
        if (!product) {
            console.error('[ADDFOOD] Product not found:', productId);
            console.log('[ADDFOOD] Available products:', appContext.productsDatabase.length);
            // Пробуем найти по имени
            const productByName = appContext.productsDatabase.find(p => 
                String(p.id) === String(productId) || p.name === productId
            );
            if (productByName) {
                console.log('[ADDFOOD] Found by name:', productByName);
                this.selectedProduct = productByName;
            } else {
                Helpers.showNotification('Продукт не найден', 'error');
                return;
            }
        } else {
            this.selectedProduct = product;
        }
        
        const amountSection = document.getElementById('product-amount-section');
        const nameEl = document.getElementById('selected-product-name');
        const macrosEl = document.getElementById('selected-product-macros');
        const searchInput = document.getElementById('product-search');
        
        if (amountSection) {
            amountSection.style.display = 'block';
            amountSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (nameEl) nameEl.textContent = product.name || 'Продукт';
        if (macrosEl) {
            macrosEl.innerHTML = `
                <span>${Math.round(product.kcal || 0)} ккал</span>
                <span>Б: ${Math.round(product.protein || 0)}г</span>
                <span>Ж: ${Math.round(product.fat || 0)}г</span>
                <span>У: ${Math.round(product.carbs || 0)}г</span>
            `;
        }
        if (searchInput) searchInput.blur();

        this.updateCalculatedMacros();
        this.hapticFeedback('light');
    }

    updateCalculatedMacros() {
        if (!this.selectedProduct) return;

        const gramsInput = document.getElementById('product-grams');
        const calculatedEl = document.getElementById('calculated-macros');
        
        if (!gramsInput || !calculatedEl) return;

        const grams = parseFloat(gramsInput.value) || 100;
        const multiplier = grams / 100;

        const kcal = (this.selectedProduct.kcal || 0) * multiplier;
        const protein = (this.selectedProduct.protein || 0) * multiplier;
        const fat = (this.selectedProduct.fat || 0) * multiplier;
        const carbs = (this.selectedProduct.carbs || 0) * multiplier;

        calculatedEl.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                <div>
                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">Калории</div>
                    <div style="font-family: var(--font-mono); font-size: 24px; font-weight: 600;">${Math.round(kcal)}</div>
                </div>
                <div>
                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">Белки</div>
                    <div style="font-family: var(--font-mono); font-size: 24px; font-weight: 600;">${Math.round(protein)}г</div>
                </div>
                <div>
                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">Жиры</div>
                    <div style="font-family: var(--font-mono); font-size: 24px; font-weight: 600;">${Math.round(fat)}г</div>
                </div>
                <div>
                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">Углеводы</div>
                    <div style="font-family: var(--font-mono); font-size: 24px; font-weight: 600;">${Math.round(carbs)}г</div>
                </div>
            </div>
        `;
    }

    async addToDiary() {
        if (!this.selectedProduct) {
            Helpers.showNotification('Выберите продукт', 'error');
            return;
        }

        const gramsInput = document.getElementById('product-grams');
        if (!gramsInput) return;

        const grams = parseFloat(gramsInput.value) || 100;
        const multiplier = grams / 100;

        const entry = {
            id: Date.now().toString(),
            name: this.selectedProduct.name || 'Продукт',
            grams: grams,
            kcal: (this.selectedProduct.kcal || 0) * multiplier,
            protein: (this.selectedProduct.protein || 0) * multiplier,
            fat: (this.selectedProduct.fat || 0) * multiplier,
            carbs: (this.selectedProduct.carbs || 0) * multiplier,
            timestamp: new Date().toISOString()
        };

        const today = Helpers.getToday();
        await appContext.addDiaryEntry(today, entry);

        this.hapticFeedback('medium');
        Helpers.showNotification('Продукт добавлен!', 'success');
        this.hide();
        
        // Обновляем dashboard
        if (document.getElementById('dashboard-screen')?.classList.contains('active')) {
            dashboardScreen.update();
        }
    }
}

const addFoodScreen = new AddFoodScreen();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AddFoodScreen;
}
