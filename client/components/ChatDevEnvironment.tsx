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
          content: `Perfect! I've created your Flutter app session and generated your initial app.\n\nYour app is now running at: ${sessionData.session.previewUrl}\n\nThe app is ready to run! You can see the preview in the right panel and make changes through this chat.`,
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
        content: 'I apologize, but I encountered an error setting up your Flutter session. This might be due to server configuration issues. Let me create a basic template for you to get started.',
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

        const successMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'assistant',
          content: `I've updated your Flutter app based on your request!\n\nYour changes have been applied and the app has been hot reloaded.\n\nYou can see the updated preview at: ${previewUrl}`,
          timestamp: new Date(),
          files: data.files || []
        }

        setMessages(prev => [...prev.slice(0, -1), successMessage])

        // Update files if we got file information
        if (data.files && data.files.length > 0) {
          setFiles(createFileTree(data.files))
          // Update active file if it exists in the new files
          const currentFile = data.files.find((f: any) => f.path === activeFile)
          if (currentFile) {
            setActiveFileContent(currentFile.content)
          }
        }
      } else {
        throw new Error(`Failed to update code: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error updating code:', error)
      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        type: 'assistant',
        content: `I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or check if the session is still active.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev.slice(0, -1), errorMessage])
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
          {/* Left: Chat Section */}
          <Allotment.Pane minSize={350} maxSize={500}>
            <div className="h-full bg-gray-800 flex flex-col">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-white font-medium">AI Assistant</h3>
                <p className="text-gray-400 text-sm">Building your Flutter app</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(message => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-100'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs mt-2 opacity-70">{formatTime(message.timestamp)}</p>
                    </div>
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="bg-gray-700 text-gray-100 p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        <span className="text-sm">Generating...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-700">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask me to modify your app..."
                    className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isGenerating}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isGenerating}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-md transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </Allotment.Pane>

          {/* Center: Mobile App Simulator with Tabs */}
          <Allotment.Pane minSize={300} maxSize={450}>
            <div className="h-full bg-gray-800 flex flex-col">
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-white font-medium">Mobile Simulator</h3>
                    <p className="text-gray-400 text-sm">{sessionId ? `Session: ${sessionId.slice(0, 8)}...` : 'Loading session...'}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      sessionStatus === 'ready' ? 'bg-green-500' :
                      sessionStatus === 'initializing' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-xs text-gray-400">
                      {sessionStatus === 'ready' ? 'Ready' :
                       sessionStatus === 'initializing' ? 'Starting...' : 'Error'}
                    </span>
                  </div>
                </div>

                {/* App Screen Tabs */}
                <div className="flex space-x-1">
                  {['main', 'settings', 'profile'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1 text-xs rounded-md transition-colors capitalize ${
                        activeTab === tab
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 p-4 flex justify-center">
                <div className="w-full max-w-sm h-full bg-gray-900 rounded-lg border-2 border-gray-600 overflow-hidden relative">
                  {/* Mobile Frame */}
                  <div className="absolute inset-4 bg-black rounded-lg overflow-hidden">
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

          {/* Right: Collapsible Code Panel */}
          {rightPanelCollapsed ? (
            <div className="w-12 bg-gray-800 border-l border-gray-700 flex flex-col items-center py-4">
              <button
                onClick={() => setRightPanelCollapsed(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors mb-2"
                title="Open Code Editor"
              >
                <Code className="h-5 w-5" />
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
            <Allotment.Pane minSize={400} maxSize={800}>
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