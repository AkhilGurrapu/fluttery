'use client'

import { useState, useEffect, useRef } from 'react'
import { Allotment } from 'allotment'
import CodeEditor from './CodeEditor'
import { ArrowLeft, Send, Folder, File, Play, Download, Settings, Share, Smartphone, FolderOpen, ChevronRight, ChevronDown, Code, X, Tabs } from 'lucide-react'
import 'allotment/dist/style.css'

interface FileTreeItem {
  path: string
  content: string
  type: 'file' | 'folder'
  children?: FileTreeItem[]
  expanded?: boolean
}

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  files?: Array<{ path: string; content: string }>
}

interface ChatDevEnvironmentProps {
  initialPrompt: string
  appType: string
  onBack: () => void
}

export default function ChatDevEnvironment({ initialPrompt, appType, onBack }: ChatDevEnvironmentProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [projectName, setProjectName] = useState('My Flutter App')
  const [files, setFiles] = useState<FileTreeItem[]>([])
  const [activeFile, setActiveFile] = useState<string>('')
  const [activeFileContent, setActiveFileContent] = useState<string>('')
  const [sessionId, setSessionId] = useState<string>('')
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [sessionStatus, setSessionStatus] = useState<'initializing' | 'ready' | 'error'>('initializing')
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true)
  const [activeTab, setActiveTab] = useState('main')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Start with initial generation
    generateInitialApp()
  }, [initialPrompt])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const generateInitialApp = async () => {
    setIsGenerating(true)
    setSessionStatus('initializing')

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: initialPrompt,
      timestamp: new Date()
    }
    setMessages([userMessage])

    // Add assistant thinking message
    const thinkingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: 'I\'ll help you build this Flutter app. Creating a new Flutter session and setting up your project...',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, thinkingMessage])

    try {
      // Create session with initial prompt
      const sessionResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initialPrompt: initialPrompt,
          appType: appType
        }),
      })

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json()
        setSessionId(sessionData.session.id)
        setPreviewUrl(sessionData.session.previewUrl)
        setSessionStatus('ready')

        // Update the thinking message with success
        const successMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'assistant',
          content: `🎉 **Flutter Session Created!**\n\nI've initialized your Flutter app with multi-agent capabilities:\n\n🤖 **Design Agent**: Ready for UI/UX creation\n⚡ **Code Agent**: Ready for Flutter development\n🧪 **Testing Agent**: Ready for quality assurance\n\nYour app preview: ${sessionData.session.previewUrl}\n\n**Next:** Describe what you want to build and I'll coordinate the AI agents to create your app!`,
          timestamp: new Date()
        }

        setMessages(prev => [...prev.slice(0, -1), successMessage])

        // Set up basic file structure (we'll get actual files from the session later if needed)
        const basicFiles = [{ path: 'lib/main.dart', content: getBasicTemplate() }]
        setFiles(createFileTree(basicFiles))
        setActiveFile('lib/main.dart')
        setActiveFileContent(getBasicTemplate())

      } else {
        throw new Error(`Failed to create session: ${sessionResponse.statusText}`)
      }
    } catch (error) {
      console.error('Error creating session:', error)
      setSessionStatus('error')
      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        type: 'assistant',
        content: '⚠️ **Session Setup Issue**\n\nI encountered an error initializing the Flutter session. This might be due to:\n\n• Server configuration\n• Port conflicts\n• API limitations\n\nLet me create a basic template for you to get started while we resolve this.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev.slice(0, -1), errorMessage])

      // Fallback to basic template
      const basicTemplate = getBasicTemplate()
      setFiles(createFileTree([{ path: 'lib/main.dart', content: basicTemplate }]))
      setActiveFile('lib/main.dart')
      setActiveFileContent(basicTemplate)
    } finally {
      setIsGenerating(false)
    }
  }

  const createFileTree = (fileList: Array<{ path: string; content: string }>): FileTreeItem[] => {
    const tree: FileTreeItem[] = []
    const folders: { [key: string]: FileTreeItem } = {}

    fileList.forEach(file => {
      const parts = file.path.split('/')
      let currentPath = ''
      let currentLevel = tree

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        currentPath = currentPath ? `${currentPath}/${part}` : part

        if (i === parts.length - 1) {
          // It's a file
          currentLevel.push({
            path: file.path,
            content: file.content,
            type: 'file'
          })
        } else {
          // It's a folder
          let folder = folders[currentPath]
          if (!folder) {
            folder = {
              path: currentPath,
              content: '',
              type: 'folder',
              children: [],
              expanded: true
            }
            folders[currentPath] = folder
            currentLevel.push(folder)
          }
          currentLevel = folder.children!
        }
      }
    })

    return tree
  }

  const getBasicTemplate = () => {
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
            Icon(Icons.flutter_dash, size: 100, color: Colors.blue),
            SizedBox(height: 24),
            Text(
              'Welcome to your Flutter app!',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 16),
            Text('Generated from: "${initialPrompt}"', textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}`
  }

  const handleContinueExecution = async () => {
    if (!sessionId) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/${sessionId}/continue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.status === 'completed') {
          // Update the last message with completion status
          const completionMessage: Message = {
            id: (Date.now() + 4).toString(),
            type: 'assistant',
            content: `✅ **Multi-Agent Processing Complete!**\n\nAll agents have finished their tasks. Your Flutter app has been generated and is ready to use!\n\nPreview: ${previewUrl}`,
            timestamp: new Date()
          }
          setMessages(prev => [...prev.slice(0, -1), completionMessage])

          // Update files if available
          if (data.data && data.data.code && data.data.code.files) {
            setFiles(createFileTree(data.data.code.files))
          }
        } else if (data.success && data.status !== 'completed') {
          // Continue polling
          setTimeout(() => {
            handleContinueExecution()
          }, 3000)
        }
      }
    } catch (error) {
      console.error('Error continuing execution:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isGenerating || !sessionId) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsGenerating(true)

    // Add assistant thinking message
    const thinkingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: 'Let me help you with that modification and update your Flutter app...',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, thinkingMessage])

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/${sessionId}/code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: inputMessage
        }),
      })

      if (response.ok) {
        const data = await response.json()

        let successContent = ''
        if (data.success) {
          if (data.status === 'completed') {
            successContent = `✅ **Multi-Agent System Complete!**\n\nI've successfully built your Flutter app using specialized AI agents:\n\n🎨 **Design Agent**: Created UI/UX specifications\n💻 **Code Agent**: Generated Flutter code with best practices\n🧪 **Testing Agent**: Created comprehensive test suite\n\nYour app is ready and has been hot reloaded!\n\nPreview: ${previewUrl}`

            // If we have generated files from multi-agent system
            if (data.data && data.data.code && data.data.code.files) {
              setFiles(createFileTree(data.data.code.files))
              // Update active file if it exists
              const currentFile = data.data.code.files.find((f: any) => f.path === activeFile)
              if (currentFile) {
                setActiveFileContent(currentFile.content)
              }
            }
          } else {
            successContent = `⚙️ **Multi-Agent Processing...**\n\nStatus: ${data.status}\nProgress: ${data.progress?.completedPlans || 0}/${data.progress?.totalPlans || 0} tasks\nCurrent Agent: ${data.progress?.currentAgent || 'Coordinating'}\n\nThe specialized agents are working on your request...`

            // Continue polling for updates if not completed
            setTimeout(() => {
              handleContinueExecution()
            }, 3000)
          }
        } else {
          successContent = `❌ **Processing Failed**\n\nError: ${data.error}\n\nThe multi-agent system encountered an issue. This might be due to API configuration. Let me create a basic template for you instead.`

          // Fallback to basic template
          const basicTemplate = getBasicTemplate()
          setFiles(createFileTree([{ path: 'lib/main.dart', content: basicTemplate }]))
          setActiveFile('lib/main.dart')
          setActiveFileContent(basicTemplate)
        }

        const successMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'assistant',
          content: successContent,
          timestamp: new Date(),
          files: data.files || []
        }

        setMessages(prev => [...prev.slice(0, -1), successMessage])
      } else {
        throw new Error(`Failed to process request: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error processing multi-agent request:', error)
      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        type: 'assistant',
        content: `🔧 **Multi-Agent System Error**\n\nI encountered an issue: ${error instanceof Error ? error.message : 'Unknown error'}\n\nThis might be due to server configuration or API limitations. Let me create a basic template for you to get started.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev.slice(0, -1), errorMessage])

      // Fallback to basic template
      const basicTemplate = getBasicTemplate()
      setFiles(createFileTree([{ path: 'lib/main.dart', content: basicTemplate }]))
      setActiveFile('lib/main.dart')
      setActiveFileContent(basicTemplate)
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleFolderExpansion = (folderPath: string) => {
    const updateItems = (items: FileTreeItem[]): FileTreeItem[] => {
      return items.map(item => {
        if (item.path === folderPath && item.type === 'folder') {
          return { ...item, expanded: !item.expanded }
        }
        if (item.children) {
          return { ...item, children: updateItems(item.children) }
        }
        return item
      })
    }
    setFiles(updateItems(files))
  }

  const renderFileTree = (items: FileTreeItem[], level = 0): JSX.Element[] => {
    return items.map(item => (
      <div key={item.path}>
        <div
          className={`flex items-center space-x-2 py-2 px-2 cursor-pointer hover:bg-gray-700 rounded-sm transition-colors ${
            activeFile === item.path ? 'bg-blue-600 hover:bg-blue-700' : ''
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => {
            if (item.type === 'file') {
              setActiveFile(item.path)
              setActiveFileContent(item.content)
            } else if (item.type === 'folder') {
              toggleFolderExpansion(item.path)
            }
          }}
        >
          {item.type === 'folder' ? (
            <>
              {item.expanded ?
                <ChevronDown className="h-4 w-4 text-gray-400 hover:text-white transition-colors" /> :
                <ChevronRight className="h-4 w-4 text-gray-400 hover:text-white transition-colors" />
              }
              <FolderOpen className={`h-4 w-4 ${item.expanded ? 'text-yellow-400' : 'text-yellow-500'}`} />
            </>
          ) : (
            <>
              <div className="w-4"></div>
              <File className={`h-4 w-4 ${
                item.path.endsWith('.dart') ? 'text-blue-400' :
                item.path.endsWith('.yaml') || item.path.endsWith('.yml') ? 'text-red-400' :
                item.path.endsWith('.json') ? 'text-green-400' :
                'text-gray-400'
              }`} />
            </>
          )}
          <span className={`text-sm truncate ${
            activeFile === item.path ? 'text-white font-medium' : 'text-gray-300'
          }`}>
            {item.path.split('/').pop()}
          </span>
          {item.type === 'file' && activeFile === item.path && (
            <div className="w-2 h-2 bg-blue-400 rounded-full ml-auto flex-shrink-0"></div>
          )}
        </div>
        {item.type === 'folder' && item.expanded && item.children && (
          <div className="border-l border-gray-600 ml-3">
            {renderFileTree(item.children, level + 1)}
          </div>
        )}
      </div>
    ))
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
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
            <button className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors">
              <Play className="h-4 w-4" />
              <span>Run</span>
            </button>
            <button className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">
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

      {/* Main Content */}
      <div className="flex-1 bg-gray-900">
        <Allotment>
          {/* Left: Chat Section - Super Highlighted */}
          <Allotment.Pane minSize={400} maxSize={600} preferredSize={480}>
            <div className="h-full bg-gradient-to-br from-gray-800 via-gray-800 to-gray-700 flex flex-col border-r-2 border-blue-500/30">
              <div className="p-4 border-b border-blue-500/20 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">🤖</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">AI Assistant</h3>
                    <p className="text-blue-300 text-sm font-medium">Multi-Agent Flutter Builder</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-gray-800/50 to-gray-900/50">
                {messages.map(message => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl shadow-lg backdrop-blur-sm ${
                      message.type === 'user'
                        ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 text-white border border-blue-400/30'
                        : 'bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 text-gray-100 border border-gray-500/30'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      <p className="text-xs mt-3 opacity-75 font-medium">{formatTime(message.timestamp)}</p>
                    </div>
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white p-4 rounded-2xl shadow-lg border border-blue-400/30">
                      <div className="flex items-center space-x-3">
                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                        <span className="text-sm font-medium">Multi-Agent System Processing...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-6 border-t border-blue-500/20 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Describe your app or ask me to modify it..."
                    className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gradient-to-r focus:from-gray-500 focus:to-gray-600 border border-gray-500 placeholder-gray-300"
                    disabled={isGenerating}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isGenerating}
                    className="px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </Allotment.Pane>

          {/* Center: Mobile App Simulator - Main Highlight */}
          <Allotment.Pane minSize={380} maxSize={600} preferredSize={500}>
            <div className="h-full bg-gradient-to-b from-gray-800 to-gray-900 flex flex-col border-x border-gray-600">
              <div className="p-6 border-b border-gray-600 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                      <Smartphone className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-xl">Mobile Simulator</h3>
                      <p className="text-gray-300 text-sm font-medium">{sessionId ? `Session: ${sessionId.slice(0, 8)}...` : 'Loading session...'}</p>
                    </div>
                  </div>
                  <div className={`flex items-center space-x-3 px-3 py-2 rounded-full border ${
                    sessionStatus === 'ready' ? 'bg-green-500/20 border-green-500/30' :
                    sessionStatus === 'initializing' ? 'bg-yellow-500/20 border-yellow-500/30' : 'bg-red-500/20 border-red-500/30'
                  }`}>
                    <div className={`w-3 h-3 rounded-full animate-pulse ${
                      sessionStatus === 'ready' ? 'bg-green-500' :
                      sessionStatus === 'initializing' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className={`text-sm font-medium ${
                      sessionStatus === 'ready' ? 'text-green-300' :
                      sessionStatus === 'initializing' ? 'text-yellow-300' : 'text-red-300'
                    }`}>
                      {sessionStatus === 'ready' ? 'Ready' :
                       sessionStatus === 'initializing' ? 'Starting...' : 'Error'}
                    </span>
                  </div>
                </div>

                {/* App Screen Tabs */}
                <div className="flex space-x-2 p-1 bg-gray-700/50 rounded-lg border border-gray-600">
                  {['main', 'settings', 'profile'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 capitalize ${
                        activeTab === tab
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                          : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 p-8 flex justify-center bg-gradient-to-b from-gray-900 to-black">
                <div className="w-full max-w-md h-full bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl border-4 border-gray-500 overflow-hidden relative shadow-2xl">
                  {/* Mobile Frame */}
                  <div className="absolute inset-6 bg-black rounded-xl overflow-hidden border border-gray-700">
                    {previewUrl && sessionStatus === 'ready' ? (
                      <iframe
                        src={`${previewUrl}${activeTab !== 'main' ? `#/${activeTab}` : ''}`}
                        className="w-full h-full border-none"
                        title={`Flutter App Preview - ${activeTab}`}
                        sandbox="allow-scripts allow-same-origin"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center text-gray-400">
                          {sessionStatus === 'initializing' && (
                            <>
                              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                              <p className="text-sm">Starting Flutter app...</p>
                            </>
                          )}
                          {sessionStatus === 'error' && (
                            <>
                              <div className="w-8 h-8 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <span className="text-white text-sm">!</span>
                              </div>
                              <p className="text-sm">Failed to start preview</p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mobile Frame Elements */}
                  <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gray-600 rounded-full"></div>
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gray-600 rounded-full"></div>
                </div>
              </div>
            </div>
          </Allotment.Pane>

          {/* Right: Collapsible Code Panel - Extreme Right */}
          {rightPanelCollapsed ? (
            <div className="w-16 bg-gradient-to-b from-gray-800 to-gray-900 border-l-2 border-gray-600 flex flex-col items-center py-6">
              <button
                onClick={() => setRightPanelCollapsed(false)}
                className="p-3 text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 rounded-lg transition-all duration-300 mb-3 transform hover:scale-105"
                title="Open Code Editor"
              >
                <Code className="h-6 w-6" />
              </button>
              <button
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors mb-2"
                title="File Explorer"
              >
                <Folder className="h-5 w-5" />
              </button>
              <button
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <Allotment.Pane minSize={500} maxSize={900} preferredSize={650}>
              <Allotment vertical>
                {/* File Tree */}
                <Allotment.Pane minSize={200} maxSize={300}>
                  <div className="h-full bg-gray-800 border-b border-gray-700">
                    <div className="p-4 border-b border-gray-700">
                      <div className="flex items-center justify-between">
                        <h3 className="text-white font-medium">Project Files</h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400 text-xs">{files.length} files</span>
                          <button
                            onClick={() => setRightPanelCollapsed(true)}
                            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                            title="Collapse Panel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-y-auto p-2">
                      {renderFileTree(files)}
                    </div>
                  </div>
                </Allotment.Pane>

                {/* Code Editor */}
                <Allotment.Pane minSize={300}>
                  <div className="h-full bg-gray-900">
                    {activeFile ? (
                      <div className="h-full flex flex-col">
                        <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <File className="h-4 w-4 text-blue-400" />
                              <span className="text-white text-sm">{activeFile}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-700 transition-colors">
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setActiveFile('')
                                  setActiveFileContent('')
                                }}
                                className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 transition-colors"
                                title="Close File"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <CodeEditor
                            value={activeFileContent}
                            onChange={setActiveFileContent}
                            language="dart"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <File className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium mb-2">No File Selected</p>
                          <p className="text-sm">Select a file from the project tree to view its contents</p>
                          <button
                            onClick={() => setRightPanelCollapsed(true)}
                            className="mt-4 text-xs text-gray-400 hover:text-white underline"
                          >
                            Collapse panel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </Allotment.Pane>
              </Allotment>
            </Allotment.Pane>
          )}
        </Allotment>
      </div>
    </div>
  )
}