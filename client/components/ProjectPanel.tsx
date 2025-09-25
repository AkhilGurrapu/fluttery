'use client'

import { useState } from 'react'
import { Folder, File, ChevronRight, ChevronDown, Settings, Database, Palette } from 'lucide-react'

interface ProjectPanelProps {
  projectName: string
  onProjectNameChange: (name: string) => void
}

const PROJECT_STRUCTURE = [
  {
    name: 'lib',
    type: 'folder',
    expanded: true,
    children: [
      { name: 'main.dart', type: 'file', active: true },
      { name: 'models', type: 'folder', children: [] },
      { name: 'screens', type: 'folder', children: [] },
      { name: 'widgets', type: 'folder', children: [] },
      { name: 'services', type: 'folder', children: [] },
    ]
  },
  {
    name: 'assets',
    type: 'folder',
    children: [
      { name: 'images', type: 'folder', children: [] },
      { name: 'fonts', type: 'folder', children: [] },
    ]
  },
  { name: 'pubspec.yaml', type: 'file' },
  { name: 'android', type: 'folder', children: [] },
  { name: 'ios', type: 'folder', children: [] },
]

interface FileTreeItemProps {
  item: any
  level: number
  onFileSelect?: (file: string) => void
}

function FileTreeItem({ item, level, onFileSelect }: FileTreeItemProps) {
  const [expanded, setExpanded] = useState(item.expanded || false)

  const handleToggle = () => {
    if (item.type === 'folder') {
      setExpanded(!expanded)
    } else if (onFileSelect) {
      onFileSelect(item.name)
    }
  }

  return (
    <div>
      <div
        className={`flex items-center space-x-2 px-2 py-1 cursor-pointer hover:bg-gray-100 ${
          item.active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleToggle}
      >
        {item.type === 'folder' ? (
          <>
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
            <Folder className="h-4 w-4 text-yellow-600" />
          </>
        ) : (
          <>
            <div className="w-4" />
            <File className="h-4 w-4 text-blue-600" />
          </>
        )}
        <span className="text-sm">{item.name}</span>
      </div>

      {item.type === 'folder' && expanded && item.children && (
        <div>
          {item.children.map((child: any, index: number) => (
            <FileTreeItem
              key={index}
              item={child}
              level={level + 1}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProjectPanel({ projectName, onProjectNameChange }: ProjectPanelProps) {
  const [activeTab, setActiveTab] = useState<'files' | 'settings' | 'firebase'>('files')

  const tabs = [
    { id: 'files' as const, label: 'Files', icon: Folder },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
    { id: 'firebase' as const, label: 'Firebase', icon: Database },
  ]

  return (
    <div className="h-full bg-white border-l border-gray-200 flex flex-col">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'files' && (
          <div className="p-4">
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                PROJECT NAME
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => onProjectNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-2">
              <h3 className="text-xs font-medium text-gray-700 uppercase tracking-wider">
                Project Structure
              </h3>
            </div>

            <div className="space-y-1">
              {PROJECT_STRUCTURE.map((item, index) => (
                <FileTreeItem key={index} item={item} level={0} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">App Settings</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    App Name
                  </label>
                  <input
                    type="text"
                    defaultValue={projectName}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Package Name
                  </label>
                  <input
                    type="text"
                    defaultValue="com.example.myapp"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Target Platform
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm">
                    <option>Both (iOS & Android)</option>
                    <option>iOS only</option>
                    <option>Android only</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Theme</h3>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Palette className="h-4 w-4 text-gray-500" />
                  <select className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm">
                    <option>Material Design</option>
                    <option>Cupertino (iOS)</option>
                    <option>Custom</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center">
                    <div className="w-full h-8 bg-blue-500 rounded mb-1"></div>
                    <span className="text-xs text-gray-600">Primary</span>
                  </div>
                  <div className="text-center">
                    <div className="w-full h-8 bg-green-500 rounded mb-1"></div>
                    <span className="text-xs text-gray-600">Accent</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'firebase' && (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Firebase Services</h3>

              <div className="space-y-3">
                {[
                  { name: 'Authentication', enabled: true, description: 'User sign in/up' },
                  { name: 'Firestore', enabled: true, description: 'NoSQL database' },
                  { name: 'Storage', enabled: false, description: 'File storage' },
                  { name: 'Analytics', enabled: false, description: 'App analytics' },
                  { name: 'Cloud Functions', enabled: false, description: 'Serverless functions' },
                ].map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{service.name}</div>
                      <div className="text-xs text-gray-500">{service.description}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        defaultChecked={service.enabled}
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Configuration</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Project ID
                  </label>
                  <input
                    type="text"
                    placeholder="your-firebase-project-id"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>

                <button className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-sm">
                  Connect Firebase Project
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}