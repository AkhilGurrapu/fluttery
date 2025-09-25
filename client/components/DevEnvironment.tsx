'use client'

import { useState, useEffect } from 'react'
import { Allotment } from 'allotment'
import CodeEditor from './CodeEditor'
import MobilePreview from './MobilePreview'
import { ArrowLeft, Play, Download, Settings, Share, Smartphone } from 'lucide-react'
import 'allotment/dist/style.css'

interface DevEnvironmentProps {
  initialPrompt: string
  appType: string
  onBack: () => void
}

export default function DevEnvironment({ initialPrompt, appType, onBack }: DevEnvironmentProps) {
  const [code, setCode] = useState('')
  const [isGenerating, setIsGenerating] = useState(true)
  const [projectName, setProjectName] = useState('My Flutter App')
  const [showPreview, setShowPreview] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [generationStep, setGenerationStep] = useState('Initializing...')

  useEffect(() => {
    generateInitialApp()
  }, [initialPrompt, appType])

  const generateInitialApp = async () => {
    setIsGenerating(true)
    setShowPreview(false)

    const steps = [
      'Analyzing your requirements...',
      'Designing app architecture...',
      'Generating Flutter components...',
      'Setting up navigation...',
      'Integrating Firebase services...',
      'Optimizing for mobile...',
      'Finalizing code structure...'
    ]

    // Simulate step-by-step generation
    for (let i = 0; i < steps.length; i++) {
      setGenerationStep(steps[i])
      await new Promise(resolve => setTimeout(resolve, 800))
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: initialPrompt,
          projectContext: {
            name: projectName,
            firebase: true,
            appType: appType
          }
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCode(data.code)
        setShowPreview(true)
        setPreviewKey(prev => prev + 1)
      } else {
        console.error('Failed to generate code')
        // Fallback to demo code
        setCode(getDemoCode())
        setShowPreview(true)
      }
    } catch (error) {
      console.error('Error generating code:', error)
      // Fallback to demo code
      setCode(getDemoCode())
      setShowPreview(true)
    } finally {
      setIsGenerating(false)
    }
  }

  const getDemoCode = () => {
    return `import 'package:flutter/material.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '${projectName}',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      home: HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('${projectName}'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.flutter_dash,
              size: 100,
              color: Colors.blue,
            ),
            SizedBox(height: 24),
            Text(
              'Welcome to your Flutter app!',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.grey[800],
              ),
            ),
            SizedBox(height: 16),
            Text(
              'Generated from: "${initialPrompt}"',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
              ),
            ),
            SizedBox(height: 32),
            ElevatedButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('App is ready!')),
                );
              },
              child: Text('Get Started'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
                padding: EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              ),
            ),
          ],
        ),
      ),
    );
  }
}`
  }

  const handleCodeChange = (newCode: string) => {
    setCode(newCode)
    // Debounced preview update
    setTimeout(() => {
      setPreviewKey(prev => prev + 1)
    }, 1000)
  }

  const handleExport = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          projectName,
          includeFirebase: true
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}_flutter_project.zip`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting project:', error)
    }
  }

  if (isGenerating) {
    return (
      <div className="h-screen bg-gray-900 flex flex-col">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-white font-semibold">{projectName}</h1>
                  <p className="text-gray-400 text-sm">{appType} • Generating...</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Generation Progress */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-semibold text-white mb-2">Building your Flutter app</h2>
            <p className="text-gray-400 mb-4">This may take a moment...</p>
            <div className="bg-gray-800 px-6 py-3 rounded-lg">
              <p className="text-orange-400 text-sm">{generationStep}</p>
            </div>

            <div className="mt-8 max-w-md mx-auto">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-300 mb-2">Your request:</p>
                <p className="text-white text-sm italic">"{initialPrompt}"</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
              <div>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="bg-transparent text-white font-semibold border-none outline-none focus:bg-gray-700 px-2 py-1 rounded"
                />
                <p className="text-gray-400 text-sm">{appType} • Flutter</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setPreviewKey(prev => prev + 1)}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              <Play className="h-4 w-4" />
              <span>Run</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            <button className="p-2 text-gray-400 hover:text-white transition-colors">
              <Share className="h-4 w-4" />
            </button>
            <button className="p-2 text-gray-400 hover:text-white transition-colors">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Development Environment */}
      <div className="flex-1 bg-gray-900">
        <Allotment>
          {/* Code Editor Pane */}
          <Allotment.Pane minSize={300}>
            <div className="h-full bg-gray-900">
              <CodeEditor
                value={code}
                onChange={handleCodeChange}
                language="dart"
              />
            </div>
          </Allotment.Pane>

          {/* Preview Pane */}
          {showPreview && (
            <Allotment.Pane minSize={320} maxSize={400}>
              <div className="h-full bg-gray-800 border-l border-gray-700">
                <div className="h-full flex flex-col">
                  <div className="px-6 py-4 bg-gray-800 border-b border-gray-700">
                    <div className="flex items-center space-x-2">
                      <Smartphone className="h-5 w-5 text-gray-400" />
                      <h2 className="text-white font-medium">Preview</h2>
                      <div className="ml-auto flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-xs text-gray-400">Live</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 p-6">
                    <MobilePreview code={code} key={previewKey} />
                  </div>
                </div>
              </div>
            </Allotment.Pane>
          )}
        </Allotment>
      </div>
    </div>
  )
}