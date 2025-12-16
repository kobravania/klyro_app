/**
 * OnboardingScreen - форма заполнения профиля
 * Минималистичная форма в стиле Apple
 */

class OnboardingScreen {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.formData = {};
        this.init();
    }

    init() {
        this.createHTML();
        // Ждем, пока DOM обновится, затем привязываем обработчики
        setTimeout(() => {
            this.attachHandlers();
        }, 100);
    }

    createHTML() {
        const screenHTML = `
            <div id="onboarding-screen" class="screen">
                <div class="screen-content">
                    <div class="onboarding-header">
                        <h1 class="screen-title">Добро пожаловать в Klyro</h1>
                        <p style="color: var(--text-secondary); margin-bottom: var(--spacing-xl);">
                            Заполните профиль для расчета целевых калорий
                        </p>
                    </div>

                    <!-- Прогресс -->
                    <div class="onboarding-progress" style="margin-bottom: var(--spacing-xl);">
                        <div class="progress-bar" style="height: 4px; background: var(--bg-surface); border-radius: var(--radius-full); overflow: hidden;">
                            <div class="progress-fill" id="onboarding-progress" style="height: 100%; background: var(--accent); transition: width var(--transition-base); width: 25%;"></div>
                        </div>
                        <div style="text-align: center; margin-top: var(--spacing-sm); font-size: 13px; color: var(--text-secondary);">
                            Шаг <span id="onboarding-step-number">1</span> из ${this.totalSteps}
                        </div>
                    </div>

                    <!-- Шаг 1: Дата рождения -->
                    <div class="onboarding-step active" data-step="1">
                        <div class="card" style="margin-bottom: var(--spacing-md);">
                            <h3 class="section-title" style="margin-bottom: var(--spacing-lg); text-align: center;">Дата рождения</h3>
                            <input type="date" 
                                   id="onboarding-date" 
                                   class="input" 
                                   max="${new Date().toISOString().split('T')[0]}"
                                   style="font-size: 18px; text-align: center; margin-bottom: var(--spacing-sm); width: 100%; display: block;">
                            <p style="font-size: 13px; color: var(--text-secondary); text-align: center; margin: 0;">
                                Нам нужна дата рождения для расчета возраста
                            </p>
                        </div>
                    </div>

                    <!-- Шаг 2: Пол -->
                    <div class="onboarding-step" data-step="2" style="display: none;">
                        <div class="card" style="margin-bottom: var(--spacing-md);">
                            <h3 class="section-title" style="margin-bottom: var(--spacing-lg); text-align: center;">Пол</h3>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); max-width: 400px; margin: 0 auto;">
                                <button class="btn btn-secondary" data-gender="male" id="gender-male" style="min-height: 80px; flex-direction: column; display: flex; align-items: center; justify-content: center;">
                                    <div style="font-size: 32px; margin-bottom: var(--spacing-xs);">👨</div>
                                    <div style="font-weight: 500;">Мужской</div>
                                </button>
                                <button class="btn btn-secondary" data-gender="female" id="gender-female" style="min-height: 80px; flex-direction: column; display: flex; align-items: center; justify-content: center;">
                                    <div style="font-size: 32px; margin-bottom: var(--spacing-xs);">👩</div>
                                    <div style="font-weight: 500;">Женский</div>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Шаг 3: Рост и вес -->
                    <div class="onboarding-step" data-step="3" style="display: none;">
                        <div class="card" style="margin-bottom: var(--spacing-md);">
                            <h3 class="section-title" style="margin-bottom: var(--spacing-lg);">Рост</h3>
                            <div style="margin-bottom: var(--spacing-xl);">
                                <div style="text-align: center; margin-bottom: var(--spacing-md);">
                                    <span class="number-large" id="height-display" style="display: inline-block;">170</span>
                                    <span style="font-size: 18px; color: var(--text-secondary); margin-left: var(--spacing-sm);">см</span>
                                </div>
                                <input type="range" 
                                       id="onboarding-height" 
                                       min="100" 
                                       max="220" 
                                       value="170" 
                                       step="1"
                                       class="onboarding-slider">
                            </div>
                            
                            <h3 class="section-title" style="margin-top: var(--spacing-xl); margin-bottom: var(--spacing-lg);">Вес</h3>
                            <div>
                                <div style="text-align: center; margin-bottom: var(--spacing-md);">
                                    <span class="number-large" id="weight-display" style="display: inline-block;">70</span>
                                    <span style="font-size: 18px; color: var(--text-secondary); margin-left: var(--spacing-sm);">кг</span>
                                </div>
                                <input type="range" 
                                       id="onboarding-weight" 
                                       min="30" 
                                       max="200" 
                                       value="70" 
                                       step="0.5"
                                       class="onboarding-slider">
                            </div>
                        </div>
                    </div>

                    <!-- Шаг 4: Активность и цель -->
                    <div class="onboarding-step" data-step="4" style="display: none;">
                        <div class="card" style="margin-bottom: var(--spacing-md);">
                            <h3 class="section-title">Уровень активности</h3>
                            <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                                <button class="btn btn-secondary" data-activity="low" id="activity-low" style="justify-content: flex-start; text-align: left;">
                                    <div>
                                        <div style="font-weight: 600; margin-bottom: 4px;">Низкая</div>
                                        <div style="font-size: 13px; color: var(--text-secondary);">Сидячий образ жизни</div>
                                    </div>
                                </button>
                                <button class="btn btn-secondary" data-activity="moderate" id="activity-moderate" style="justify-content: flex-start; text-align: left;">
                                    <div>
                                        <div style="font-weight: 600; margin-bottom: 4px;">Умеренная</div>
                                        <div style="font-size: 13px; color: var(--text-secondary);">Тренировки 3-5 раз в неделю</div>
                                    </div>
                                </button>
                                <button class="btn btn-secondary" data-activity="high" id="activity-high" style="justify-content: flex-start; text-align: left;">
                                    <div>
                                        <div style="font-weight: 600; margin-bottom: 4px;">Высокая</div>
                                        <div style="font-size: 13px; color: var(--text-secondary);">Тренировки 6-7 раз в неделю</div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div class="card">
                            <h3 class="section-title">Цель</h3>
                            <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                                <button class="btn btn-secondary" data-goal="lose" id="goal-lose" style="justify-content: flex-start; text-align: left;">
                                    <div>
                                        <div style="font-weight: 600; margin-bottom: 4px;">Похудение</div>
                                        <div style="font-size: 13px; color: var(--text-secondary);">Снизить вес</div>
                                    </div>
                                </button>
                                <button class="btn btn-secondary" data-goal="maintain" id="goal-maintain" style="justify-content: flex-start; text-align: left;">
                                    <div>
                                        <div style="font-weight: 600; margin-bottom: 4px;">Поддержание</div>
                                        <div style="font-size: 13px; color: var(--text-secondary);">Сохранить текущий вес</div>
                                    </div>
                                </button>
                                <button class="btn btn-secondary" data-goal="gain" id="goal-gain" style="justify-content: flex-start; text-align: left;">
                                    <div>
                                        <div style="font-weight: 600; margin-bottom: 4px;">Набор массы</div>
                                        <div style="font-size: 13px; color: var(--text-secondary);">Увеличить мышечную массу</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Кнопки навигации -->
                    <div class="onboarding-actions" style="margin-top: var(--spacing-xl); display: flex; gap: var(--spacing-md);">
                        <button class="btn btn-secondary" id="onboarding-back" style="flex: 1; display: none;">
                            Назад
                        </button>
                        <button class="btn btn-primary" id="onboarding-next" style="flex: 1;">
                            Далее
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
        // Дата рождения
        const dateInput = document.getElementById('onboarding-date');
        if (dateInput) {
            dateInput.addEventListener('change', (e) => {
                this.formData.dateOfBirth = e.target.value;
            });
        }

        // Пол
        document.querySelectorAll('[data-gender]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-gender]').forEach(b => b.classList.remove('btn-primary'));
                e.target.closest('[data-gender]').classList.add('btn-primary');
                this.formData.gender = e.target.closest('[data-gender]').dataset.gender;
                this.hapticFeedback('light');
            });
        });

        // Рост
        const heightInput = document.getElementById('onboarding-height');
        const heightDisplay = document.getElementById('height-display');
        if (heightInput && heightDisplay) {
            heightInput.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                heightDisplay.textContent = value;
                this.formData.height = value;
            });
            this.formData.height = parseInt(heightInput.value);
        }

        // Вес
        const weightInput = document.getElementById('onboarding-weight');
        const weightDisplay = document.getElementById('weight-display');
        if (weightInput && weightDisplay) {
            weightInput.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                weightDisplay.textContent = value.toFixed(1);
                this.formData.weight = value;
            });
            this.formData.weight = parseFloat(weightInput.value);
        }

        // Активность и цель - используем делегирование событий на document с capture phase
        // Это гарантирует, что обработчики будут работать даже если элементы создаются динамически
        const handleActivityClick = (e) => {
            const activityBtn = e.target.closest('[data-activity]');
            if (activityBtn) {
                const screen = document.getElementById('onboarding-screen');
                if (screen && screen.contains(activityBtn)) {
                    e.preventDefault();
                    e.stopPropagation();
                    document.querySelectorAll('[data-activity]').forEach(b => {
                        b.classList.remove('btn-primary');
                        if (!b.classList.contains('btn-secondary')) {
                            b.classList.add('btn-secondary');
                        }
                    });
                    activityBtn.classList.remove('btn-secondary');
                    activityBtn.classList.add('btn-primary');
                    this.formData.activity = activityBtn.dataset.activity;
                    console.log('[ONBOARDING] Выбрана активность:', this.formData.activity);
                    this.hapticFeedback('light');
                }
            }
        };

        const handleGoalClick = (e) => {
            const goalBtn = e.target.closest('[data-goal]');
            if (goalBtn) {
                const screen = document.getElementById('onboarding-screen');
                if (screen && screen.contains(goalBtn)) {
                    e.preventDefault();
                    e.stopPropagation();
                    document.querySelectorAll('[data-goal]').forEach(b => {
                        b.classList.remove('btn-primary');
                        if (!b.classList.contains('btn-secondary')) {
                            b.classList.add('btn-secondary');
                        }
                    });
                    goalBtn.classList.remove('btn-secondary');
                    goalBtn.classList.add('btn-primary');
                    this.formData.goal = goalBtn.dataset.goal;
                    console.log('[ONBOARDING] Выбрана цель:', this.formData.goal);
                    this.hapticFeedback('light');
                }
            }
        };

        // Удаляем старые обработчики, если они есть
        if (this._activityHandler) {
            document.removeEventListener('click', this._activityHandler, true);
        }
        if (this._goalHandler) {
            document.removeEventListener('click', this._goalHandler, true);
        }

        // Сохраняем ссылки на обработчики для последующего удаления
        this._activityHandler = handleActivityClick;
        this._goalHandler = handleGoalClick;

        // Добавляем обработчики на document с capture phase
        document.addEventListener('click', this._activityHandler, true);
        document.addEventListener('click', this._goalHandler, true);

        // Кнопки навигации
        const nextBtn = document.getElementById('onboarding-next');
        const backBtn = document.getElementById('onboarding-back');
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextStep());
        }
        
        if (backBtn) {
            backBtn.addEventListener('click', () => this.prevStep());
        }
    }

    hapticFeedback(type = 'light') {
        if (window.Telegram?.WebApp?.HapticFeedback) {
            try {
                window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
            } catch (e) {}
        }
    }

    show() {
        const screen = document.getElementById('onboarding-screen');
        if (!screen) {
            this.createHTML();
            setTimeout(() => this.show(), 50);
            return;
        }
        
        hideAllScreens();
        screen.classList.add('active');
        screen.style.display = 'flex';
        screen.style.flexDirection = 'column';
        
        this.currentStep = 1;
        this.updateStep();
    }

    hide() {
        const screen = document.getElementById('onboarding-screen');
        if (screen) {
            screen.classList.remove('active');
            screen.style.display = 'none';
        }
    }

    updateStep() {
        // Показываем/скрываем шаги
        document.querySelectorAll('.onboarding-step').forEach((step, index) => {
            if (index + 1 === this.currentStep) {
                step.style.display = 'block';
            } else {
                step.style.display = 'none';
            }
        });

        // Обновляем прогресс
        const progress = (this.currentStep / this.totalSteps) * 100;
        const progressEl = document.getElementById('onboarding-progress');
        if (progressEl) progressEl.style.width = `${progress}%`;

        const stepNumberEl = document.getElementById('onboarding-step-number');
        if (stepNumberEl) stepNumberEl.textContent = this.currentStep;

        // Обновляем кнопки
        const nextBtn = document.getElementById('onboarding-next');
        const backBtn = document.getElementById('onboarding-back');

        if (nextBtn) {
            if (this.currentStep === this.totalSteps) {
                nextBtn.textContent = 'Завершить';
            } else {
                nextBtn.textContent = 'Далее';
            }
        }

        if (backBtn) {
            backBtn.style.display = this.currentStep > 1 ? 'flex' : 'none';
        }
    }

    nextStep() {
        // Валидация текущего шага
        if (!this.validateStep()) {
            Helpers.showNotification('Заполните все поля', 'error');
            return;
        }

        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateStep();
            this.hapticFeedback('light');
        } else {
            // Завершаем онбординг
            this.completeOnboarding();
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStep();
            this.hapticFeedback('light');
        }
    }

    validateStep() {
        switch (this.currentStep) {
            case 1:
                return !!this.formData.dateOfBirth;
            case 2:
                return !!this.formData.gender;
            case 3:
                return !!(this.formData.height && this.formData.weight);
            case 4:
                return !!(this.formData.activity && this.formData.goal);
            default:
                return true;
        }
    }

    async completeOnboarding() {
        try {
            console.log('[ONBOARDING] Завершение онбординга, данные формы:', this.formData);
            console.log('[ONBOARDING] Тип данных:', typeof this.formData, Array.isArray(this.formData));
            
            // Рассчитываем возраст
            if (this.formData.dateOfBirth) {
                this.formData.age = Helpers.getAge(this.formData.dateOfBirth);
                console.log('[ONBOARDING] Рассчитан возраст:', this.formData.age);
            }

            // Проверяем, что все обязательные поля заполнены
            if (!this.formData.dateOfBirth && !this.formData.age) {
                throw new Error('Дата рождения не указана');
            }
            if (!this.formData.gender) {
                throw new Error('Пол не указан');
            }
            if (!this.formData.height || this.formData.height <= 0) {
                throw new Error('Рост не указан');
            }
            if (!this.formData.weight || this.formData.weight <= 0) {
                throw new Error('Вес не указан');
            }
            if (!this.formData.activity) {
                throw new Error('Уровень активности не указан');
            }
            if (!this.formData.goal) {
                throw new Error('Цель не указана');
            }

            console.log('[ONBOARDING] Все поля заполнены, сохраняем данные...');
            console.log('[ONBOARDING] Данные для сохранения:', JSON.stringify(this.formData, null, 2));
            
            // Создаем чистый объект для сохранения (без прототипов)
            const cleanData = {
                dateOfBirth: this.formData.dateOfBirth,
                age: this.formData.age,
                gender: this.formData.gender,
                height: Number(this.formData.height),
                weight: Number(this.formData.weight),
                activity: this.formData.activity,
                goal: this.formData.goal
            };
            
            console.log('[ONBOARDING] Чистые данные для сохранения:', cleanData);
            
            // Сохраняем данные
            await appContext.setUserData(cleanData);
            
            // Проверяем, что данные сохранились
            const savedData = appContext.getUserData();
            console.log('[ONBOARDING] Данные сохранены, проверка:', savedData);
            console.log('[ONBOARDING] hasCompleteProfile:', appContext.hasCompleteProfile());
            
            // Дополнительно проверяем localStorage напрямую
            const storageKey = storage.getStorageKey('klyro_user_data');
            const localStorageData = localStorage.getItem(storageKey);
            if (localStorageData) {
                try {
                    const parsed = JSON.parse(localStorageData);
                    console.log('[ONBOARDING] Данные в localStorage:', parsed);
                } catch (e) {
                    console.error('[ONBOARDING] Ошибка парсинга localStorage:', e);
                }
            } else {
                console.warn('[ONBOARDING] Данные не найдены в localStorage!');
            }

            this.hapticFeedback('medium');
            Helpers.showNotification('Профиль сохранен!', 'success');

            // Небольшая задержка перед переходом
            await new Promise(resolve => setTimeout(resolve, 300));

            // Показываем Dashboard
            hideAllScreens();
            navigation.show();
            dashboardScreen.show();
            navigation.switchTab('home');
        } catch (error) {
            console.error('[ONBOARDING] Error:', error);
            console.error('[ONBOARDING] Error stack:', error.stack);
            console.error('[ONBOARDING] Error message:', error.message);
            Helpers.showNotification('Ошибка при сохранении данных: ' + error.message, 'error');
        }
    }
}

const onboardingScreen = new OnboardingScreen();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = OnboardingScreen;
}

window.onboardingScreen = onboardingScreen;
window.showOnboardingScreen = () => onboardingScreen.show();

