'use client'

import { useState, useEffect, useRef } from 'react'
import { Allotment } from 'allotment'
import CodeEditor from './CodeEditor'
import { ArrowLeft, Send, Folder, File, Play, Download, Settings, Share, Smartphone, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react'
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
      content: 'I\'ll help you build this Flutter app. Let me analyze your requirements and create the project structure...',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, thinkingMessage])

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

        // Update the thinking message with success
        const successMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'assistant',
          content: `Perfect! I've created your Flutter app: "${data.explanation || 'A beautiful Flutter application'}".\n\nHere's what I've generated:\n\n${data.files ? data.files.map((f: any) => `📄 ${f.path}`).join('\n') : '📄 lib/main.dart'}\n\nThe app is ready to run! You can see the code in the editor and make any changes you'd like.`,
          timestamp: new Date(),
          files: data.files || [{ path: 'lib/main.dart', content: data.code }]
        }

        setMessages(prev => [...prev.slice(0, -1), successMessage])

        // Set up files
        const generatedFiles = data.files || [{ path: 'lib/main.dart', content: data.code }]
        setFiles(createFileTree(generatedFiles))

        // Set first file as active
        if (generatedFiles.length > 0) {
          setActiveFile(generatedFiles[0].path)
          setActiveFileContent(generatedFiles[0].content)
        }

      } else {
        throw new Error('Failed to generate code')
      }
    } catch (error) {
      console.error('Error generating code:', error)
      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error generating your app. Let me create a basic template for you to get started.',
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
    if (!inputMessage.trim() || isGenerating) return

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
      content: 'Let me help you with that modification...',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, thinkingMessage])

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: inputMessage,
          currentCode: activeFileContent,
          projectContext: { name: projectName, firebase: true }
        }),
      })

      if (response.ok) {
        const data = await response.json()

        const successMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'assistant',
          content: `I've updated your Flutter app based on your request. Here are the changes:\n\n${data.explanation || 'Code has been updated successfully!'}`,
          timestamp: new Date(),
          files: data.files || [{ path: activeFile, content: data.code }]
        }

        setMessages(prev => [...prev.slice(0, -1), successMessage])

        // Update files if we got multiple files
        if (data.files) {
          setFiles(createFileTree(data.files))
        } else if (data.code) {
          setActiveFileContent(data.code)
        }
      }
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        type: 'assistant',
        content: 'I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev.slice(0, -1), errorMessage])
    } finally {
      setIsGenerating(false)
    }
  }

  const renderFileTree = (items: FileTreeItem[], level = 0): JSX.Element[] => {
    return items.map(item => (
      <div key={item.path}>
        <div
          className={`flex items-center space-x-2 py-1 px-2 cursor-pointer hover:bg-gray-700 ${
            activeFile === item.path ? 'bg-blue-600' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            if (item.type === 'file') {
              setActiveFile(item.path)
              setActiveFileContent(item.content)
            }
          }}
        >
          {item.type === 'folder' ? (
            <>
              {item.expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
              <Folder className="h-4 w-4 text-yellow-500" />
            </>
          ) : (
            <>
              <div className="w-4"></div>
              <File className="h-4 w-4 text-blue-400" />
            </>
          )}
          <span className="text-sm text-gray-300">{item.path.split('/').pop()}</span>
        </div>
        {item.type === 'folder' && item.expanded && item.children && (
          <div>{renderFileTree(item.children, level + 1)}</div>
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
          {/* Left: Chat + Files */}
          <Allotment.Pane minSize={350} maxSize={500}>
            <Allotment vertical>
              {/* Chat Messages */}
              <Allotment.Pane minSize={200}>
                <div className="h-full bg-gray-800 flex flex-col">
                  <div className="p-4 border-b border-gray-700">
                    <h3 className="text-white font-medium">Assistant</h3>
                    <p className="text-gray-400 text-sm">Building your Flutter app</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map(message => (
                      <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg ${
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

              {/* File Tree */}
              <Allotment.Pane minSize={150}>
                <div className="h-full bg-gray-800 border-t border-gray-700">
                  <div className="p-4 border-b border-gray-700">
                    <h3 className="text-white font-medium">Files</h3>
                    <p className="text-gray-400 text-sm">{files.length} files</p>
                  </div>
                  <div className="overflow-y-auto">
                    {renderFileTree(files)}
                  </div>
                </div>
              </Allotment.Pane>
            </Allotment>
          </Allotment.Pane>

          {/* Right: Code Editor */}
          <Allotment.Pane minSize={400}>
            <div className="h-full bg-gray-900">
              {activeFile ? (
                <div className="h-full flex flex-col">
                  <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
                    <div className="flex items-center space-x-2">
                      <File className="h-4 w-4 text-blue-400" />
                      <span className="text-white text-sm">{activeFile}</span>
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
                    <p>Select a file to view its contents</p>
                  </div>
                </div>
              )}
            </div>
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  )
}