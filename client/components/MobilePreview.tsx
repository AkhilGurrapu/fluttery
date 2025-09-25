'use client'

import { useState, useEffect, useRef } from 'react'
import { Smartphone, RotateCcw, Play, AlertTriangle } from 'lucide-react'

interface MobilePreviewProps {
  code: string
}

export default function MobilePreview({ code }: MobilePreviewProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const generatePreview = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })

      if (response.ok) {
        const data = await response.json()
        setPreviewUrl(data.previewUrl)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to generate preview')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshPreview = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src
    }
  }

  useEffect(() => {
    if (code.trim()) {
      generatePreview()
    }
  }, [code])

  return (
    <div className="h-full flex flex-col">
      {/* Preview Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Smartphone className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">iPhone 14 Pro</span>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={refreshPreview}
            disabled={isLoading || !previewUrl}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
            title="Refresh preview"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            onClick={generatePreview}
            disabled={isLoading}
            className="flex items-center space-x-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            title="Generate preview"
          >
            <Play className="h-3 w-3" />
            <span>Run</span>
          </button>
        </div>
      </div>

      {/* Phone Frame */}
      <div className="flex-1 flex justify-center">
        <div className="phone-frame relative" style={{ width: '280px', height: '560px' }}>
          <div className="phone-screen w-full h-full relative">
            {/* Status Bar */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-black flex items-center justify-between px-4 text-white text-xs z-10">
              <span>9:41 AM</span>
              <div className="flex space-x-1">
                <div className="w-4 h-2 bg-white rounded-sm"></div>
                <div className="w-1 h-2 bg-white rounded-sm"></div>
                <div className="w-6 h-2 bg-white rounded-sm"></div>
              </div>
            </div>

            {/* Content Area */}
            <div className="absolute top-8 left-0 right-0 bottom-0 bg-white">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="loading-spinner w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-3"></div>
                    <div className="text-sm text-gray-600">Building app...</div>
                  </div>
                </div>
              ) : error ? (
                <div className="h-full flex items-center justify-center p-4">
                  <div className="text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <div className="text-sm text-red-600 mb-2">Preview Error</div>
                    <div className="text-xs text-gray-600 bg-red-50 p-2 rounded">
                      {error}
                    </div>
                    <button
                      onClick={generatePreview}
                      className="mt-3 px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : previewUrl ? (
                <iframe
                  ref={iframeRef}
                  src={previewUrl}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                  title="Flutter App Preview"
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <div className="text-sm">No preview available</div>
                    <div className="text-xs mt-1">Write some Flutter code to see preview</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => generatePreview()}
          disabled={isLoading}
          className="px-3 py-2 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Hot Reload
        </button>
        <button
          onClick={() => generatePreview()}
          disabled={isLoading}
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          Full Restart
        </button>
      </div>
    </div>
  )
}