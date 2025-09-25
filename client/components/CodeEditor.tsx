'use client'

import { useState, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { Code2, Copy, Check } from 'lucide-react'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language?: string
}

export default function CodeEditor({ value, onChange, language = 'dart' }: CodeEditorProps) {
  const [copied, setCopied] = useState(false)
  const editorRef = useRef<any>(null)

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor

    // Configure Dart language support
    monaco.languages.register({ id: 'dart' })

    monaco.languages.setMonarchTokensProvider('dart', {
      tokenizer: {
        root: [
          [/\b(class|extends|implements|with|abstract|enum|mixin)\b/, 'keyword'],
          [/\b(void|int|double|String|bool|List|Map|Set|var|final|const|static)\b/, 'type'],
          [/\b(if|else|while|for|do|break|continue|return|switch|case|default)\b/, 'keyword'],
          [/\b(import|export|library|part|async|await|yield)\b/, 'keyword'],
          [/\b(true|false|null)\b/, 'constant'],
          [/\/\/.*$/, 'comment'],
          [/\/\*[\s\S]*?\*\//, 'comment'],
          [/'([^'\\]|\\.)*'/, 'string'],
          [/"([^"\\]|\\.)*"/, 'string'],
          [/\b\d+(\.\d+)?\b/, 'number'],
          [/[{}()\[\]]/, 'bracket'],
          [/[<>]=?|[!=]=|&&|\|\||[+\-*\/=]/, 'operator'],
        ],
      },
    })

    // Set theme
    monaco.editor.defineTheme('flutterTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'C792EA' },
        { token: 'type', foreground: '82AAFF' },
        { token: 'string', foreground: 'C3E88D' },
        { token: 'comment', foreground: '546E7A' },
        { token: 'number', foreground: 'F78C6C' },
        { token: 'constant', foreground: 'FF5370' },
      ],
      colors: {
        'editor.background': '#263238',
        'editor.foreground': '#EEFFFF',
        'editorLineNumber.foreground': '#546E7A',
        'editorCursor.foreground': '#FFCC02',
        'editor.selectionBackground': '#3F51B5',
      },
    })

    monaco.editor.setTheme('flutterTheme')
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Code2 className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-gray-300">main.dart</span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center space-x-2 px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Editor
          value={value}
          language={language}
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineHeight: 1.5,
            fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'on',
            lineNumbers: 'on',
            glyphMargin: false,
            folding: true,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
            renderLineHighlight: 'line',
            selectionHighlight: false,
            contextmenu: true,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorStyle: 'line',
            renderWhitespace: 'none',
            links: true,
            mouseWheelZoom: true,
            multiCursorModifier: 'ctrlCmd',
            accessibilitySupport: 'auto',
            find: {
              autoFindInSelection: 'never',
              seedSearchStringFromSelection: 'never',
            },
          }}
        />
      </div>
    </div>
  )
}