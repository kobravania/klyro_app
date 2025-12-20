import { useState, useEffect } from 'react'
import InitScreen from './components/InitScreen'
import OnboardingScreen from './components/OnboardingScreen'
import DashboardScreen from './components/DashboardScreen'

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string
        ready: () => void
        expand: () => void
      }
    }
  }
}

type AppState = 'init' | 'onboarding' | 'dashboard' | 'error'

function App() {
  const [state, setState] = useState<AppState>('init')
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    // Инициализируем Telegram WebApp
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready()
      window.Telegram.WebApp.expand()
    }
  }, [])

  const handleInitComplete = (hasProfile: boolean, profileData?: any) => {
    if (hasProfile && profileData) {
      setProfile(profileData)
      setState('dashboard')
    } else if (!hasProfile) {
      setState('onboarding')
    } else {
      setState('error')
    }
  }

  const handleProfileSaved = (profileData: any) => {
    setProfile(profileData)
    setState('dashboard')
  }

  if (state === 'init') {
    return <InitScreen onComplete={handleInitComplete} />
  }

  if (state === 'onboarding') {
    return <OnboardingScreen onComplete={handleProfileSaved} />
  }

  if (state === 'dashboard') {
    return <DashboardScreen profile={profile} />
  }

  return <div>Ошибка</div>
}

export default App

