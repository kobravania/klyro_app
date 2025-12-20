import { useEffect, useState } from 'react'

interface InitScreenProps {
  onComplete: (hasProfile: boolean, profileData?: any) => void
}

function InitScreen({ onComplete }: InitScreenProps) {
  const [status, setStatus] = useState<'loading' | 'error'>('loading')

  useEffect(() => {
    const init = async () => {
      // Получаем initData из Telegram WebApp
      const initData = window.Telegram?.WebApp?.initData || ''
      
      if (!initData) {
        setStatus('error')
        return
      }

      try {
        // Отправляем initData на backend через прокси Vite
        const response = await fetch('/api/init', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': initData,
          },
        })

        if (!response.ok) {
          setStatus('error')
          return
        }

        const data = await response.json()
        const { has_profile } = data

        if (has_profile) {
          // Загружаем профиль через прокси Vite
          const profileResponse = await fetch('/api/profile', {
            method: 'GET',
            headers: {
              'X-Telegram-Init-Data': initData,
            },
          })

          if (profileResponse.ok) {
            const profileData = await profileResponse.json()
            onComplete(true, profileData)
          } else {
            onComplete(false)
          }
        } else {
          onComplete(false)
        }
      } catch (error) {
        console.error('Init error:', error)
        setStatus('error')
      }
    }

    init()
  }, [onComplete])

  if (status === 'error') {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Ошибка инициализации</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.loader}>K</div>
      <div style={styles.text}>Klyro</div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#f5f5f7',
  },
  loader: {
    fontSize: '64px',
    fontWeight: 'bold',
    color: '#007aff',
    marginBottom: '16px',
  },
  text: {
    fontSize: '24px',
    color: '#1d1d1f',
    fontWeight: 500,
  },
  error: {
    fontSize: '18px',
    color: '#ff3b30',
  },
}

export default InitScreen

