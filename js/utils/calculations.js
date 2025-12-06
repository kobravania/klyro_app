/**
 * Утилиты для расчетов калорий, BMR, TDEE
 * Сохраняет старую логику расчетов
 */

class Calculations {
    /**
     * Рассчитать BMR (Basal Metabolic Rate) по формуле Миффлина-Сан Жеора
     * @param {number} weight - вес в кг
     * @param {number} height - рост в см
     * @param {number} age - возраст в годах
     * @param {string} gender - 'male' или 'female'
     * @returns {number} BMR в ккал
     */
    static calculateBMR(weight, height, age, gender) {
        if (!weight || !height || !age || !gender) {
            return 0;
        }
        
        if (gender === 'male') {
            return 10 * weight + 6.25 * height - 5 * age + 5;
        } else {
            return 10 * weight + 6.25 * height - 5 * age - 161;
        }
    }

    /**
     * Рассчитать TDEE (Total Daily Energy Expenditure)
     * @param {number} bmr - BMR
     * @param {string} activity - уровень активности: 'low', 'moderate', 'high'
     * @returns {number} TDEE в ккал
     */
    static calculateTDEE(bmr, activity) {
        const activityMultipliers = {
            'low': 1.2,
            'moderate': 1.55,
            'high': 1.9
        };
        
        const multiplier = activityMultipliers[activity] || 1.2;
        return bmr * multiplier;
    }

    /**
     * Рассчитать целевые калории с учетом цели
     * @param {number} tdee - TDEE
     * @param {string} goal - цель: 'lose', 'maintain', 'gain'
     * @returns {number} целевые калории в ккал
     */
    static calculateGoalCalories(tdee, goal) {
        const goalAdjustments = {
            'lose': 0.85,
            'maintain': 1.0,
            'gain': 1.15
        };
        
        const adjustment = goalAdjustments[goal] || 1.0;
        return tdee * adjustment;
    }

    /**
     * Полный расчет целевых калорий из данных пользователя
     * Сохраняет старую логику из calculateCalories()
     * @param {Object} userData - данные пользователя
     * @returns {number} целевые калории в ккал
     */
    static calculateCalories(userData) {
        if (!userData) return 0;
        
        // Получаем возраст
        let age = null;
        if (userData.dateOfBirth) {
            const birthDate = new Date(userData.dateOfBirth);
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
        } else if (userData.age) {
            age = userData.age;
        }
        
        if (!age || !userData.gender || !userData.height || !userData.weight) {
            return 0;
        }
        
        // Рассчитываем BMR
        const bmr = this.calculateBMR(userData.weight, userData.height, age, userData.gender);
        
        // Рассчитываем TDEE
        const tdee = this.calculateTDEE(bmr, userData.activity || 'low');
        
        // Применяем цель
        return this.calculateGoalCalories(tdee, userData.goal || 'maintain');
    }

    /**
     * Рассчитать макросы (белки, жиры, углеводы) в граммах
     * @param {number} calories - калории
     * @param {Object} macrosRatio - соотношение макросов {protein: 0.3, fat: 0.3, carbs: 0.4}
     * @returns {Object} {protein, fat, carbs} в граммах
     */
    static calculateMacros(calories, macrosRatio = {protein: 0.3, fat: 0.3, carbs: 0.4}) {
        return {
            protein: Math.round((calories * macrosRatio.protein) / 4), // 4 ккал на грамм
            fat: Math.round((calories * macrosRatio.fat) / 9), // 9 ккал на грамм
            carbs: Math.round((calories * macrosRatio.carbs) / 4) // 4 ккал на грамм
        };
    }

    /**
     * Рассчитать прогресс по макросам
     * @param {Array} entries - записи дневника за день
     * @returns {Object} {protein, fat, carbs, kcal} в граммах и ккал
     */
    static calculateDayProgress(entries) {
        if (!entries || !Array.isArray(entries)) {
            return { protein: 0, fat: 0, carbs: 0, kcal: 0 };
        }
        
        return entries.reduce((acc, entry) => {
            acc.protein += entry.protein || 0;
            acc.fat += entry.fat || 0;
            acc.carbs += entry.carbs || 0;
            acc.kcal += entry.kcal || 0;
            return acc;
        }, { protein: 0, fat: 0, carbs: 0, kcal: 0 });
    }
}

// Экспортируем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calculations;
}

