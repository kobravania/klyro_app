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

