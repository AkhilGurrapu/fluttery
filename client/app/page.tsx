'use client'

import { useState } from 'react'
import LandingPage from '@/components/LandingPage'
import ChatDevEnvironment from '@/components/ChatDevEnvironment'

export default function Home() {
  const [currentView, setCurrentView] = useState<'landing' | 'dev'>('landing')
  const [currentPrompt, setCurrentPrompt] = useState('')
  const [currentAppType, setCurrentAppType] = useState('mobile')

  const handleStartBuilding = (prompt: string, appType: string) => {
    setCurrentPrompt(prompt)
    setCurrentAppType(appType)
    setCurrentView('dev')
  }

  const handleBackToLanding = () => {
    setCurrentView('landing')
    setCurrentPrompt('')
    setCurrentAppType('mobile')
  }

  if (currentView === 'landing') {
    return <LandingPage onStartBuilding={handleStartBuilding} />
  }

  return (
    <ChatDevEnvironment
      initialPrompt={currentPrompt}
      appType={currentAppType}
      onBack={handleBackToLanding}
    />
  )
}