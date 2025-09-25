'use client'

import { useState } from 'react'
import { Send, Wand2, Lightbulb } from 'lucide-react'

interface PromptInputProps {
  onGenerate: (prompt: string) => void
  isGenerating: boolean
}

const EXAMPLE_PROMPTS = [
  "Create a todo app with add, delete, and mark complete functionality",
  "Build a weather app that shows current conditions and 5-day forecast",
  "Make a simple calculator with basic arithmetic operations",
  "Create a photo gallery app with grid view and detail screen",
  "Build a chat interface with message bubbles and send functionality",
  "Make a shopping cart app with products, cart, and checkout",
  "Create a fitness tracker with step counter and progress charts",
  "Build a recipe app with search, favorites, and cooking timer"
]

export default function PromptInput({ onGenerate, isGenerating }: PromptInputProps) {
  const [prompt, setPrompt] = useState('')
  const [showExamples, setShowExamples] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (prompt.trim() && !isGenerating) {
      onGenerate(prompt.trim())
      setPrompt('')
      setShowExamples(false)
    }
  }

  const handleExampleClick = (example: string) => {
    setPrompt(example)
    setShowExamples(false)
  }

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex space-x-3">
        <div className="flex-1 relative">
          <div className="relative">
            <Wand2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-500" />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your Flutter app in plain English..."
              className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={isGenerating}
            />
            <button
              type="button"
              onClick={() => setShowExamples(!showExamples)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Show examples"
            >
              <Lightbulb className="h-4 w-4" />
            </button>
          </div>

          {/* Examples Dropdown */}
          {showExamples && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
              <div className="p-3 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-1">Example prompts</h3>
                <p className="text-xs text-gray-500">Click any example to use it</p>
              </div>
              <div className="py-2">
                {EXAMPLE_PROMPTS.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(example)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!prompt.trim() || isGenerating}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {isGenerating ? (
            <>
              <div className="loading-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Generate</span>
            </>
          )}
        </button>
      </form>

      {/* Quick Tips */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="text-xs text-gray-500">💡 Try:</span>
        {["Add Firebase auth", "Include navigation", "Make it responsive", "Add animations"].map((tip, index) => (
          <button
            key={index}
            onClick={() => setPrompt(tip)}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
          >
            {tip}
          </button>
        ))}
      </div>
    </div>
  )
}