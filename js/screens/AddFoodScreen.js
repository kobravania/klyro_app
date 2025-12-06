/**
 * Экран добавления продукта в дневник
 */

class AddFoodScreen {
    constructor() {
        this.selectedProduct = null;
        this.grams = 100;
        this.init();
    }

    init() {
        this.createHTML();
        
        // Слушаем событие выбора продукта
        window.addEventListener('showAddFood', (e) => {
            this.selectedProduct = e.detail?.product || null;
            this.show();
        });
    }

    createHTML() {
        const screenHTML = `
            <div id="add-food-screen" class="screen">
                <div class="screen-content">
                    <div class="add-food-header">
                        <button class="btn-back" id="add-food-back">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="15 18 9 12 15 6"/>
                            </svg>
                        </button>
                        <h1 class="screen-title">Добавить продукт</h1>
                    </div>
                    
                    <div id="add-food-product-info" class="product-info-card">
                        <p class="empty-state">Выберите продукт</p>
                    </div>
                    
                    <div class="add-food-form">
                        <div class="form-group">
                            <label class="form-label">Количество (граммы)</label>
                            <input 
                                type="number" 
                                id="add-food-grams" 
                                class="form-input" 
                                value="100" 
                                min="1" 
                                step="1"
                            >
                        </div>
                        
                        <div class="add-food-preview" id="add-food-preview">
                            <div class="preview-item">
                                <span class="preview-label">Калории</span>
                                <span class="preview-value" id="preview-kcal">0</span>
                            </div>
                            <div class="preview-item">
                                <span class="preview-label">Белки</span>
                                <span class="preview-value" id="preview-protein">0 г</span>
                            </div>
                            <div class="preview-item">
                                <span class="preview-label">Жиры</span>
                                <span class="preview-value" id="preview-fat">0 г</span>
                            </div>
                            <div class="preview-item">
                                <span class="preview-label">Углеводы</span>
                                <span class="preview-value" id="preview-carbs">0 г</span>
                            </div>
                        </div>
                        
                        <button class="btn btn-primary btn-large" id="add-food-submit">
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

        this.attachHandlers();
    }

    attachHandlers() {
        const backBtn = document.getElementById('add-food-back');
        const gramsInput = document.getElementById('add-food-grams');
        const submitBtn = document.getElementById('add-food-submit');

        if (backBtn) {
            backBtn.addEventListener('click', () => this.hide());
        }

        if (gramsInput) {
            gramsInput.addEventListener('input', () => {
                this.grams = parseFloat(gramsInput.value) || 100;
                this.updatePreview();
            });
        }

        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.addToDiary());
        }
    }

    show() {
        const screen = document.getElementById('add-food-screen');
        if (screen) {
            screen.classList.add('active');
            screen.style.display = 'block';
            
            if (!this.selectedProduct) {
                // Если продукт не выбран, показываем экран продуктов
                productsScreen.show();
                this.hide();
                return;
            }
            
            this.updateProductInfo();
            this.updatePreview();
        }
    }

    hide() {
        const screen = document.getElementById('add-food-screen');
        if (screen) {
            screen.classList.remove('active');
            screen.style.display = 'none';
        }
    }

    updateProductInfo() {
        const infoEl = document.getElementById('add-food-product-info');
        if (!infoEl || !this.selectedProduct) return;
        
        infoEl.innerHTML = `
            <div class="product-name-large">${this.selectedProduct.name || 'Продукт'}</div>
            <div class="product-macros-large">
                <span>${Math.round(this.selectedProduct.kcal || 0)} ккал на 100г</span>
            </div>
        `;
    }

    updatePreview() {
        if (!this.selectedProduct) return;
        
        const multiplier = this.grams / 100;
        const kcal = Math.round((this.selectedProduct.kcal || 0) * multiplier);
        const protein = Math.round((this.selectedProduct.protein || 0) * multiplier);
        const fat = Math.round((this.selectedProduct.fat || 0) * multiplier);
        const carbs = Math.round((this.selectedProduct.carbs || 0) * multiplier);
        
        const kcalEl = document.getElementById('preview-kcal');
        const proteinEl = document.getElementById('preview-protein');
        const fatEl = document.getElementById('preview-fat');
        const carbsEl = document.getElementById('preview-carbs');
        
        if (kcalEl) kcalEl.textContent = kcal;
        if (proteinEl) proteinEl.textContent = protein + ' г';
        if (fatEl) fatEl.textContent = fat + ' г';
        if (carbsEl) carbsEl.textContent = carbs + ' г';
    }

    async addToDiary() {
        if (!this.selectedProduct) {
            Helpers.showNotification('Выберите продукт', 'error');
            return;
        }
        
        const grams = parseFloat(document.getElementById('add-food-grams')?.value) || 100;
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
        
        // Возвращаемся на главный экран
        this.hide();
        navigation.switchTab('home');
    }
}

const addFoodScreen = new AddFoodScreen();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AddFoodScreen;
}

