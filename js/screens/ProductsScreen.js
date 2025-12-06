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
        appContext.subscribe('products', () => this.update());
    }

    createHTML() {
        const screenHTML = `
            <div id="products-screen" class="screen">
                <div class="screen-content">
                    <div class="products-header">
                        <h1 class="screen-title">Продукты</h1>
                        <div class="search-container">
                            <input type="text" 
                                   id="products-search" 
                                   class="search-input" 
                                   placeholder="Поиск продуктов...">
                            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/>
                                <path d="M21 21l-4.35-4.35"/>
                            </svg>
                        </div>
                    </div>
                    
                    <div id="products-list" class="products-list">
                        <p class="empty-state">Загрузка продуктов...</p>
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
        this.loadProducts();
    }

    attachHandlers() {
        const searchInput = document.getElementById('products-search');
        if (searchInput) {
            searchInput.addEventListener('input', Helpers.debounce((e) => {
                this.searchQuery = e.target.value;
                this.update();
            }, 300));
        }
    }

    async loadProducts() {
        await appContext.loadProducts();
        this.update();
    }

    show() {
        const screen = document.getElementById('products-screen');
        if (screen) {
            screen.classList.add('active');
            screen.style.display = 'block';
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
        const listEl = document.getElementById('products-list');
        if (!listEl) return;
        
        const products = appContext.productsDatabase || [];
        
        if (products.length === 0) {
            listEl.innerHTML = '<p class="empty-state">Продукты не загружены</p>';
            return;
        }
        
        // Фильтруем продукты
        let filtered = products;
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = products.filter(p => 
                p.name && p.name.toLowerCase().includes(query)
            );
        }
        
        if (filtered.length === 0) {
            listEl.innerHTML = '<p class="empty-state">Ничего не найдено</p>';
            return;
        }
        
        // Отображаем продукты
        listEl.innerHTML = filtered.map(product => `
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
                <button class="product-add-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                </button>
            </div>
        `).join('');
        
        // Добавляем обработчики
        listEl.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', () => {
                const productId = card.dataset.productId;
                this.selectProduct(productId);
            });
        });
    }

    selectProduct(productId) {
        const product = appContext.findProduct(productId);
        if (product) {
            window.dispatchEvent(new CustomEvent('productSelected', { 
                detail: { product } 
            }));
            // Переключаемся на экран добавления продукта
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
