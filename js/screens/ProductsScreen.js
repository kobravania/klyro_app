/**
 * Экран поиска и выбора продуктов
 */

class ProductsScreen {
    constructor() {
        this.searchQuery = '';
        this.filteredProducts = [];
        this.init();
    }

    init() {
        this.createHTML();
        // Загружаем продукты если еще не загружены
        appContext.loadProducts().then(() => {
            this.update();
        });
    }

    createHTML() {
        const screenHTML = `
            <div id="products-screen" class="screen">
                <div class="screen-content">
                    <div class="products-header">
                        <h1 class="screen-title">Продукты</h1>
                    </div>
                    
                    <div class="search-container">
                        <input 
                            type="text" 
                            id="products-search" 
                            class="search-input" 
                            placeholder="Поиск продуктов..."
                            autocomplete="off"
                        >
                        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                    </div>
                    
                    <div class="products-list" id="products-list">
                        <p class="empty-state">Начните вводить название продукта</p>
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
        const searchInput = document.getElementById('products-search');
        if (searchInput) {
            searchInput.addEventListener('input', Helpers.debounce((e) => {
                this.searchQuery = e.target.value.trim();
                this.update();
            }, 300));
        }
    }

    show() {
        const screen = document.getElementById('products-screen');
        if (screen) {
            screen.classList.add('active');
            screen.style.display = 'block';
            // Фокусируемся на поиске
            const searchInput = document.getElementById('products-search');
            if (searchInput) {
                setTimeout(() => searchInput.focus(), 100);
            }
            this.update();
        }
    }

    hide() {
        const screen = document.getElementById('products-screen');
        if (screen) {
            screen.classList.remove('active');
            screen.style.display = 'none';
        }
    }

    update() {
        if (!this.searchQuery) {
            const listEl = document.getElementById('products-list');
            if (listEl) {
                listEl.innerHTML = '<p class="empty-state">Начните вводить название продукта</p>';
            }
            return;
        }

        this.filteredProducts = appContext.searchProducts(this.searchQuery);
        this.renderProducts();
    }

    renderProducts() {
        const listEl = document.getElementById('products-list');
        if (!listEl) return;
        
        if (this.filteredProducts.length === 0) {
            listEl.innerHTML = '<p class="empty-state">Продукты не найдены</p>';
            return;
        }
        
        listEl.innerHTML = this.filteredProducts.slice(0, 50).map(product => `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-info">
                    <div class="product-name">${product.name || 'Продукт'}</div>
                    <div class="product-macros">
                        <span>${Math.round(product.kcal || 0)} ккал</span>
                        <span>•</span>
                        <span>Б: ${Math.round(product.protein || 0)}г</span>
                        <span>Ж: ${Math.round(product.fat || 0)}г</span>
                        <span>У: ${Math.round(product.carbs || 0)}г</span>
                    </div>
                </div>
                <button class="btn-add-product" data-product-id="${product.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                </button>
            </div>
        `).join('');
        
        // Добавляем обработчики
        listEl.querySelectorAll('.btn-add-product, .product-card').forEach(el => {
            el.addEventListener('click', () => {
                const productId = el.dataset.productId || el.closest('[data-product-id]')?.dataset.productId;
                if (productId) {
                    this.selectProduct(productId);
                }
            });
        });
    }

    selectProduct(productId) {
        const product = appContext.findProduct(productId);
        if (product) {
            // Вызываем событие для открытия экрана добавления продукта
            window.dispatchEvent(new CustomEvent('showAddFood', { 
                detail: { product } 
            }));
        }
    }
}

const productsScreen = new ProductsScreen();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProductsScreen;
}

