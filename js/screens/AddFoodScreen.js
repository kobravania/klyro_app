/**
 * Экран добавления продукта в дневник
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
        const screenHTML = `
            <div id="add-food-screen" class="screen">
                <div class="screen-content">
                    <div class="screen-header">
                        <button class="btn-back" id="add-food-back">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="15 18 9 12 15 6"/>
                            </svg>
                        </button>
                        <h1 class="screen-title">Добавить продукт</h1>
                    </div>
                    
                    <div class="search-section">
                        <input type="text" 
                               id="product-search" 
                               class="search-input" 
                               placeholder="Поиск продукта...">
                    </div>
                    
                    <div id="products-list" class="products-list">
                        <p class="empty-state">Загрузка продуктов...</p>
                    </div>
                    
                    <div id="product-amount-section" class="product-amount-section" style="display: none;">
                        <div class="selected-product-info">
                            <div class="product-name" id="selected-product-name"></div>
                            <div class="product-macros" id="selected-product-macros"></div>
                        </div>
                        <div class="amount-input-group">
                            <label class="input-label">Количество (граммы)</label>
                            <input type="number" 
                                   id="product-grams" 
                                   class="number-input" 
                                   value="100" 
                                   min="1" 
                                   step="1">
                        </div>
                        <div class="calculated-macros" id="calculated-macros"></div>
                        <button class="btn btn-primary btn-block" id="add-to-diary-btn">
                            Добавить в дневник
                        </button>
                    </div>
                </div>
            </div>
        `;

        const app = document.getElementById('app');
        if (app) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = screenHTML;
            app.appendChild(tempDiv.firstElementChild);
        }
    }

    attachHandlers() {
        const backBtn = document.getElementById('add-food-back');
        const searchInput = document.getElementById('product-search');
        const gramsInput = document.getElementById('product-grams');
        const addBtn = document.getElementById('add-to-diary-btn');

        if (backBtn) {
            backBtn.addEventListener('click', () => this.hide());
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

    async show() {
        const screen = document.getElementById('add-food-screen');
        if (screen) {
            screen.classList.add('active');
            screen.style.display = 'block';
            
            // Загружаем продукты если еще не загружены
            await appContext.loadProducts();
            
            // Сбрасываем состояние
            this.selectedProduct = null;
            this.searchQuery = '';
            const searchInput = document.getElementById('product-search');
            const amountSection = document.getElementById('product-amount-section');
            if (searchInput) searchInput.value = '';
            if (amountSection) amountSection.style.display = 'none';
            
            this.updateProductsList();
        }
    }

    hide() {
        const screen = document.getElementById('add-food-screen');
        if (screen) {
            screen.classList.remove('active');
            screen.style.display = 'none';
        }
    }

    updateProductsList() {
        const listEl = document.getElementById('products-list');
        if (!listEl) return;

        let products = appContext.productsDatabase;
        
        if (this.searchQuery) {
            products = appContext.searchProducts(this.searchQuery);
        }

        if (products.length === 0) {
            listEl.innerHTML = '<p class="empty-state">Продукты не найдены</p>';
            return;
        }

        listEl.innerHTML = products.slice(0, 50).map(product => `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-info">
                    <div class="product-name">${product.name || 'Продукт'}</div>
                    <div class="product-kcal">${Math.round(product.kcal || 0)} ккал / 100г</div>
                </div>
                <button class="btn-select-product">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"/>
                    </svg>
                </button>
            </div>
        `).join('');

        // Добавляем обработчики выбора продукта
        listEl.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', () => {
                const productId = card.dataset.productId;
                this.selectProduct(productId);
            });
        });
    }

    selectProduct(productId) {
        const product = appContext.findProduct(productId);
        if (!product) return;

        this.selectedProduct = product;
        
        const amountSection = document.getElementById('product-amount-section');
        const nameEl = document.getElementById('selected-product-name');
        const macrosEl = document.getElementById('selected-product-macros');
        
        if (amountSection) amountSection.style.display = 'block';
        if (nameEl) nameEl.textContent = product.name || 'Продукт';
        if (macrosEl) {
            macrosEl.innerHTML = `
                <span>${Math.round(product.kcal || 0)} ккал</span>
                <span>Б: ${Math.round(product.protein || 0)}г</span>
                <span>Ж: ${Math.round(product.fat || 0)}г</span>
                <span>У: ${Math.round(product.carbs || 0)}г</span>
            `;
        }

        this.updateCalculatedMacros();
        
        // Прокручиваем к секции количества
        if (amountSection) {
            amountSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
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
            <div class="calculated-macro-item">
                <span class="macro-label">Калории:</span>
                <span class="macro-value">${Math.round(kcal)} ккал</span>
            </div>
            <div class="calculated-macro-item">
                <span class="macro-label">Белки:</span>
                <span class="macro-value">${Math.round(protein)}г</span>
            </div>
            <div class="calculated-macro-item">
                <span class="macro-label">Жиры:</span>
                <span class="macro-value">${Math.round(fat)}г</span>
            </div>
            <div class="calculated-macro-item">
                <span class="macro-label">Углеводы:</span>
                <span class="macro-value">${Math.round(carbs)}г</span>
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

        Helpers.showNotification('Продукт добавлен в дневник!', 'success');
        this.hide();
        
        // Обновляем dashboard если он открыт
        if (document.getElementById('dashboard-screen')?.classList.contains('active')) {
            dashboardScreen.update();
        }
    }
}

const addFoodScreen = new AddFoodScreen();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AddFoodScreen;
}
