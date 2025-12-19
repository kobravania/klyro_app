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
                            <div style="width: 100%; display: flex; justify-content: center; margin-bottom: var(--spacing-sm);">
                                <input type="date" 
                                       id="onboarding-date" 
                                       class="input onboarding-date-input" 
                                       max="${new Date().toISOString().split('T')[0]}"
                                       style="font-size: 18px; text-align: center; width: 100%; max-width: 300px; margin: 0 auto;">
                            </div>
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

        // Пол - используем делегирование событий как для активности/цели
        const handleGenderClick = (e) => {
            const genderBtn = e.target.closest('[data-gender]');
            if (genderBtn) {
                const screen = document.getElementById('onboarding-screen');
                if (screen && screen.contains(genderBtn)) {
                    e.preventDefault();
                    e.stopPropagation();
                    document.querySelectorAll('[data-gender]').forEach(b => {
                        b.classList.remove('btn-primary');
                        if (!b.classList.contains('btn-secondary')) {
                            b.classList.add('btn-secondary');
                        }
                    });
                    genderBtn.classList.remove('btn-secondary');
                    genderBtn.classList.add('btn-primary');
                    this.formData.gender = genderBtn.dataset.gender;
                    console.log('[ONBOARDING] Выбран пол:', this.formData.gender);
                    console.log('[ONBOARDING] formData после выбора пола:', this.formData);
                    // Ошибки не показываем
                    this.hapticFeedback('light');
                }
            }
        };

        // Удаляем старый обработчик, если есть
        if (this._genderHandler) {
            document.removeEventListener('click', this._genderHandler, true);
        }

        // Сохраняем ссылку на обработчик
        this._genderHandler = handleGenderClick;

        // Добавляем обработчик на document с capture phase
        document.addEventListener('click', this._genderHandler, true);

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
                    console.log('[ONBOARDING] formData после выбора активности:', this.formData);
                    // Ошибки не показываем
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
                    console.log('[ONBOARDING] formData после выбора цели:', this.formData);
                    // Ошибки не показываем
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

        // Сбрасываем локальное состояние формы при каждом показе онбординга,
        // чтобы не было “как будто всё заполнено”, если до этого был сбой.
        this.formData = {};
        // Сбрасываем выбранные кнопки (gender/activity/goal), но не трогаем primary CTA-кнопку "Далее"
        document.querySelectorAll('#onboarding-screen [data-gender], #onboarding-screen [data-activity], #onboarding-screen [data-goal]').forEach(b => {
            b.classList.remove('btn-primary');
            if (!b.classList.contains('btn-secondary')) b.classList.add('btn-secondary');
        });
        const dateInput = document.getElementById('onboarding-date');
        if (dateInput) dateInput.value = '';

        const heightInput = document.getElementById('onboarding-height');
        const heightDisplay = document.getElementById('height-display');
        if (heightInput && heightDisplay) {
            heightInput.value = '170';
            heightDisplay.textContent = '170';
        }
        const weightInput = document.getElementById('onboarding-weight');
        const weightDisplay = document.getElementById('weight-display');
        if (weightInput && weightDisplay) {
            weightInput.value = '70';
            weightDisplay.textContent = '70.0';
        }

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
            // Валидационные ошибки не показываем - форма должна предотвращать их
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

    getValidationError() {
        switch (this.currentStep) {
            case 1:
                return !this.formData.dateOfBirth ? 'Выберите дату рождения' : null;
            case 2:
                return !this.formData.gender ? 'Выберите пол' : null;
            case 3:
                if (!this.formData.height || this.formData.height <= 0) {
                    return 'Укажите рост';
                }
                if (!this.formData.weight || this.formData.weight <= 0) {
                    return 'Укажите вес';
                }
                return null;
            case 4:
                if (!this.formData.activity) {
                    return 'Выберите уровень активности';
                }
                if (!this.formData.goal) {
                    return 'Выберите цель';
                }
                return null;
            default:
                return null;
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
        let isValid = false;
        switch (this.currentStep) {
            case 1:
                isValid = !!this.formData.dateOfBirth;
                if (!isValid) {
                    console.log('[ONBOARDING] Валидация шага 1: dateOfBirth отсутствует');
                }
                break;
            case 2:
                isValid = !!this.formData.gender;
                console.log('[ONBOARDING] Валидация шага 2: gender =', this.formData.gender, 'isValid =', isValid);
                if (!isValid) {
                    console.log('[ONBOARDING] Валидация шага 2: gender отсутствует, formData:', this.formData);
                }
                break;
            case 3:
                isValid = !!(this.formData.height && this.formData.weight);
                if (!isValid) {
                    console.log('[ONBOARDING] Валидация шага 3: height или weight отсутствуют');
                }
                break;
            case 4:
                isValid = !!(this.formData.activity && this.formData.goal);
                console.log('[ONBOARDING] Валидация шага 4: activity =', this.formData.activity, 'goal =', this.formData.goal, 'isValid =', isValid);
                if (!isValid) {
                    console.log('[ONBOARDING] Валидация шага 4: activity или goal отсутствуют, formData:', this.formData);
                }
                break;
            default:
                isValid = true;
        }
        return isValid;
    }

    async completeOnboarding() {
        const nextBtn = document.getElementById('onboarding-next');
        if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.textContent = 'Сохранение...';
        }
        
        try {
            // Собираем данные из формы в формате API
            const profileData = {
                birth_date: String(this.formData.dateOfBirth).trim(),
                gender: String(this.formData.gender).toLowerCase().trim(),
                height_cm: parseInt(this.formData.height),
                weight_kg: parseInt(this.formData.weight)
            };
            
            if (typeof apiClient === 'undefined') {
                throw new Error('SERVICE_UNAVAILABLE');
            }

            // Wallet-like: POST /api/profile возвращает сохранённый профиль.
            // Backend сам извлекает telegram_user_id из валидированного initData.
            const savedProfile = await apiClient.saveProfile(profileData);
            if (!savedProfile) {
                throw new Error('SERVICE_UNAVAILABLE');
            }

            await appContext.setUserData(savedProfile);
            
            this.hapticFeedback('medium');
            
            // Переходим в Dashboard
            hideAllScreens();
            navigation.show();
            dashboardScreen.show();
            navigation.switchTab('home');
        } catch (error) {
            // При любой ошибке показываем нейтральный экран
            this.showServiceUnavailable();
        } finally {
            if (nextBtn) {
                nextBtn.disabled = false;
                nextBtn.textContent = 'Завершить';
            }
        }
    }

    showServiceUnavailable() {
        // Скрываем форму онбординга
        const screen = document.getElementById('onboarding-screen');
        if (screen) {
            screen.style.display = 'none';
        }
        
        // Показываем нейтральный экран
        const unavailableHTML = `
            <div id="service-unavailable-screen" class="screen active" style="display: flex; align-items: center; justify-content: center; padding: var(--spacing-xl);">
                <div class="card" style="text-align: center; max-width: 400px;">
                    <div style="font-size: 48px; margin-bottom: var(--spacing-lg);">⚠️</div>
                    <h2 class="screen-title" style="margin-bottom: var(--spacing-md);">Сервис временно недоступен</h2>
                    <p style="color: var(--text-secondary); margin-bottom: var(--spacing-xl);">
                        Попробуйте позже
                    </p>
                    <div style="display:flex; gap: var(--spacing-md); justify-content:center; flex-wrap:wrap;">
                        <button class="btn btn-primary" onclick="window.initApp && window.initApp()" style="min-width: 200px;">
                            Повторить
                        </button>
                        <button class="btn btn-secondary" onclick="window.Telegram?.WebApp?.close?.()" style="min-width: 200px;">
                            Закрыть
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const app = document.getElementById('app');
        if (app) {
            // Удаляем старый экран если есть
            const oldScreen = document.getElementById('service-unavailable-screen');
            if (oldScreen) {
                oldScreen.remove();
            }
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = unavailableHTML;
            app.appendChild(tempDiv.firstElementChild);
        }
    }
}

const onboardingScreen = new OnboardingScreen();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = OnboardingScreen;
}

window.onboardingScreen = onboardingScreen;
window.showOnboardingScreen = () => onboardingScreen.show();

