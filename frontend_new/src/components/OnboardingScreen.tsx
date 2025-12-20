import { useState } from 'react'

interface OnboardingScreenProps {
  onComplete: (profileData: any) => void
}

function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    age: '',
    height: '',
    weight: '',
    gender: '',
    goal: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.age || !formData.height || !formData.weight || !formData.gender || !formData.goal) {
      return
    }

    setLoading(true)

    try {
      const initData = window.Telegram?.WebApp?.initData || ''
      
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initData,
        },
        body: JSON.stringify({
          age: parseInt(formData.age),
          height: parseInt(formData.height),
          weight: parseFloat(formData.weight),
          gender: formData.gender,
          goal: formData.goal,
        }),
      })

      if (response.ok) {
        const profileData = await response.json()
        onComplete(profileData)
      }
    } catch (error) {
      console.error('Save profile error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Создание профиля</h1>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          {step === 1 && (
            <>
              <div style={styles.field}>
                <label style={styles.label}>Возраст</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  style={styles.input}
                  placeholder="25"
                  min="1"
                  max="120"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={styles.button}
                disabled={!formData.age}
              >
                Далее
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div style={styles.field}>
                <label style={styles.label}>Рост (см)</label>
                <input
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  style={styles.input}
                  placeholder="175"
                  min="100"
                  max="250"
                  required
                />
              </div>
              <div style={styles.buttons}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={styles.buttonSecondary}
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  style={styles.button}
                  disabled={!formData.height}
                >
                  Далее
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div style={styles.field}>
                <label style={styles.label}>Вес (кг)</label>
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  style={styles.input}
                  placeholder="70"
                  min="30"
                  max="300"
                  step="0.1"
                  required
                />
              </div>
              <div style={styles.buttons}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={styles.buttonSecondary}
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  style={styles.button}
                  disabled={!formData.weight}
                >
                  Далее
                </button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div style={styles.field}>
                <label style={styles.label}>Пол</label>
                <div style={styles.radioGroup}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={formData.gender === 'male'}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      style={styles.radio}
                    />
                    Мужской
                  </label>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={formData.gender === 'female'}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      style={styles.radio}
                    />
                    Женский
                  </label>
                </div>
              </div>
              <div style={styles.buttons}>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  style={styles.buttonSecondary}
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  style={styles.button}
                  disabled={!formData.gender}
                >
                  Далее
                </button>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <div style={styles.field}>
                <label style={styles.label}>Цель</label>
                <div style={styles.radioGroup}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="goal"
                      value="lose"
                      checked={formData.goal === 'lose'}
                      onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                      style={styles.radio}
                    />
                    Похудение
                  </label>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="goal"
                      value="maintain"
                      checked={formData.goal === 'maintain'}
                      onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                      style={styles.radio}
                    />
                    Поддержание
                  </label>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="goal"
                      value="gain"
                      checked={formData.goal === 'gain'}
                      onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                      style={styles.radio}
                    />
                    Набор массы
                  </label>
                </div>
              </div>
              <div style={styles.buttons}>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  style={styles.buttonSecondary}
                >
                  Назад
                </button>
                <button
                  type="submit"
                  style={styles.button}
                  disabled={!formData.goal || loading}
                >
                  {loading ? 'Сохранение...' : 'Завершить'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f7',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    maxWidth: '400px',
    width: '100%',
  },
  title: {
    fontSize: '28px',
    fontWeight: 600,
    marginBottom: '32px',
    textAlign: 'center',
    color: '#1d1d1f',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#1d1d1f',
  },
  input: {
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #d2d2d7',
    borderRadius: '12px',
    background: '#fff',
    outline: 'none',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  radio: {
    width: '20px',
    height: '20px',
  },
  buttons: {
    display: 'flex',
    gap: '12px',
  },
  button: {
    flex: 1,
    padding: '14px',
    fontSize: '16px',
    fontWeight: 500,
    background: '#007aff',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
  },
  buttonSecondary: {
    flex: 1,
    padding: '14px',
    fontSize: '16px',
    fontWeight: 500,
    background: '#e5e5ea',
    color: '#1d1d1f',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
  },
}

export default OnboardingScreen

