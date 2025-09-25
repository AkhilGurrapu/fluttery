'use client'

import { useState } from 'react'
import { Smartphone, Sparkles, Code2, Database, Palette, Settings } from 'lucide-react'

interface LandingPageProps {
  onStartBuilding: (prompt: string, appType: string) => void
}

const APP_TYPES = [
  {
    id: 'mobile',
    name: 'Mobile app',
    icon: Smartphone,
    description: 'Native mobile application',
    selected: true
  },
  {
    id: 'data',
    name: 'Data app',
    icon: Database,
    description: 'Data-driven application',
    selected: false
  },
  {
    id: '3d',
    name: '3D Game',
    icon: Code2,
    description: '3D mobile game',
    selected: false
  },
  {
    id: 'general',
    name: 'General',
    icon: Settings,
    description: 'General purpose app',
    selected: false
  },
  {
    id: 'agents',
    name: 'Agents & Automations',
    icon: Sparkles,
    description: 'AI-powered automations',
    badge: 'Beta',
    selected: false
  }
]

const EXAMPLE_PROMPTS = [
  "Build a todo app with Firebase authentication",
  "Create a weather app with location services",
  "Make a social media app with photo sharing",
  "Design a fitness tracker with step counter",
  "Build a chat app with real-time messaging",
  "Create an e-commerce app with shopping cart"
]

export default function LandingPage({ onStartBuilding }: LandingPageProps) {
  const [prompt, setPrompt] = useState('')
  const [selectedAppType, setSelectedAppType] = useState('mobile')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (prompt.trim()) {
      onStartBuilding(prompt.trim(), selectedAppType)
    }
  }

  const handleExampleClick = (example: string) => {
    setPrompt(example)
    setShowSuggestions(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-semibold">Fluttery</h1>
              <p className="text-gray-400 text-xs">AI Flutter App Builder</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          {/* Welcome Message */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              Hi {/* User name would go here */}, what do you want to make?
            </h1>
          </div>

          {/* Main Input Form */}
          <form onSubmit={handleSubmit} className="mb-8">
            <div className="relative">
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 focus-within:border-orange-500 transition-colors">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Describe the Flutter app you want to build..."
                  className="w-full bg-transparent text-white placeholder-gray-400 resize-none focus:outline-none min-h-[100px] text-lg"
                  rows={4}
                />

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Attach file"
                    >
                      <Code2 className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Auto theme"
                    >
                      <Palette className="h-5 w-5" />
                    </button>
                    <span className="text-sm text-gray-500">Auto theme</span>
                  </div>

                  <button
                    type="submit"
                    disabled={!prompt.trim()}
                    className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-2 rounded-md transition-colors flex items-center space-x-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Start building</span>
                  </button>
                </div>
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                  <div className="p-3 border-b border-gray-700">
                    <h3 className="text-sm font-medium text-white mb-1">Example prompts</h3>
                    <p className="text-xs text-gray-400">Click any example to use it</p>
                  </div>
                  <div className="py-2">
                    {EXAMPLE_PROMPTS.map((example, index) => (
                      <button
                        key={index}
                        onClick={() => handleExampleClick(example)}
                        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* App Type Selection */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {APP_TYPES.map((type) => {
              const Icon = type.icon
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedAppType(type.id)}
                  className={`relative p-4 rounded-lg border transition-all duration-200 text-left ${
                    selectedAppType === type.id
                      ? 'border-orange-500 bg-orange-500/10 text-white'
                      : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Icon className="h-6 w-6 mb-2" />
                  <div className="text-sm font-medium flex items-center space-x-2">
                    <span>{type.name}</span>
                    {type.badge && (
                      <span className="px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded">
                        {type.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                </button>
              )
            })}
          </div>

          {/* Quick Start Tips */}
          <div className="mt-12 bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">New to Flutter app building?</h2>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <h3 className="text-white font-medium mb-2">🎯 Be Specific</h3>
                <p className="text-gray-400">
                  Describe the features, screens, and functionality you want in detail.
                </p>
              </div>
              <div>
                <h3 className="text-white font-medium mb-2">🔥 Firebase Ready</h3>
                <p className="text-gray-400">
                  Mention "with Firebase" to include authentication, database, and storage.
                </p>
              </div>
              <div>
                <h3 className="text-white font-medium mb-2">📱 Mobile First</h3>
                <p className="text-gray-400">
                  All apps are optimized for mobile with responsive design and native feel.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close suggestions */}
      {showSuggestions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSuggestions(false)}
        />
      )}
    </div>
  )
}