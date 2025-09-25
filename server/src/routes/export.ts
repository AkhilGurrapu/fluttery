import { Router, Request, Response } from 'express'
import Joi from 'joi'
import { flutterEngine } from '../services/flutterEngine'
import { logger } from '../utils/logger'

const router = Router()

const exportSchema = Joi.object({
  code: Joi.string().required(),
  projectName: Joi.string().min(1).max(50).required(),
  includeFirebase: Joi.boolean().optional(),
  platform: Joi.string().valid('both', 'ios', 'android', 'web').optional(),
  dependencies: Joi.array().items(Joi.string()).optional()
})

const exportProjectSchema = Joi.object({
  projectId: Joi.string().required(),
  format: Joi.string().valid('zip', 'tar').optional()
})

// Export as downloadable project
router.post('/', async (req: Request, res: Response) => {
  try {
    const { error, value } = exportSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.details.map(d => d.message)
      })
    }

    const {
      code,
      projectName,
      includeFirebase = false,
      dependencies = [],
      platform = 'both'
    } = value

    logger.info(`Exporting project: ${projectName}`)

    // Create temporary project for export
    const project = await flutterEngine.createProject(
      projectName,
      code,
      dependencies,
      includeFirebase
    )

    // Generate additional platform-specific configurations
    await generatePlatformConfigs(project.path, platform, includeFirebase)

    // Create zip archive
    const archiveBuffer = await flutterEngine.exportProject(project.id)

    // Clean up temporary project
    await flutterEngine.cleanupProject(project.id)

    // Set headers for download
    const filename = `${projectName.toLowerCase().replace(/\s+/g, '_')}_flutter_project.zip`

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', archiveBuffer.length)

    res.send(archiveBuffer)

    logger.info(`Project exported successfully: ${projectName}`)

  } catch (error) {
    logger.error('Error exporting project:', error)

    res.status(500).json({
      error: 'Failed to export project',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Export existing project by ID
router.post('/project', async (req: Request, res: Response) => {
  try {
    const { error, value } = exportProjectSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.details.map(d => d.message)
      })
    }

    const { projectId, format = 'zip' } = value

    logger.info(`Exporting existing project: ${projectId}`)

    const archiveBuffer = await flutterEngine.exportProject(projectId)

    const filename = `flutter_project_${projectId}.${format}`

    res.setHeader('Content-Type', `application/${format}`)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', archiveBuffer.length)

    res.send(archiveBuffer)

    logger.info(`Project exported successfully: ${projectId}`)

  } catch (error) {
    logger.error('Error exporting project:', error)

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Project not found',
        message: error.message
      })
    }

    res.status(500).json({
      error: 'Failed to export project',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Generate project configuration
router.post('/config', async (req: Request, res: Response) => {
  try {
    const { projectName, bundleId, firebase, platforms } = req.body

    if (!projectName) {
      return res.status(400).json({
        error: 'Project name is required'
      })
    }

    const config = generateProjectConfig(projectName, bundleId, firebase, platforms)

    res.json({
      success: true,
      config
    })

  } catch (error) {
    logger.error('Error generating config:', error)

    res.status(500).json({
      error: 'Failed to generate configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Get export templates
router.get('/templates', (req: Request, res: Response) => {
  const templates = [
    {
      id: 'basic',
      name: 'Basic Flutter App',
      description: 'Simple Flutter app with minimal configuration',
      platforms: ['android', 'ios'],
      firebase: false
    },
    {
      id: 'firebase',
      name: 'Firebase-Enabled App',
      description: 'Flutter app with Firebase authentication and Firestore',
      platforms: ['android', 'ios', 'web'],
      firebase: true
    },
    {
      id: 'web_only',
      name: 'Web App',
      description: 'Flutter web application optimized for browsers',
      platforms: ['web'],
      firebase: false
    },
    {
      id: 'cross_platform',
      name: 'Cross-Platform App',
      description: 'Full cross-platform app for all supported platforms',
      platforms: ['android', 'ios', 'web', 'windows', 'macos', 'linux'],
      firebase: true
    }
  ]

  res.json({
    success: true,
    templates
  })
})

// Helper functions
async function generatePlatformConfigs(projectPath: string, platform: string, includeFirebase: boolean): Promise<void> {
  const fs = require('fs-extra')
  const path = require('path')

  // Generate README.md
  const readmeContent = `# Flutter Project

This project was generated using Fluttery - AI Flutter App Builder.

## Getting Started

1. Make sure you have Flutter installed on your system
2. Run \`flutter pub get\` to install dependencies
3. Run \`flutter run\` to start the app

## Available Platforms

- ${platform === 'both' ? 'iOS and Android' : platform}

## Features

- Modern Flutter architecture
- Material Design components
${includeFirebase ? '- Firebase integration (Auth, Firestore, Storage)\n' : ''}- Responsive design
- Clean code structure

## Firebase Setup${includeFirebase ? `

1. Create a Firebase project at https://console.firebase.google.com
2. Add your platform configuration files:
   - Android: \`android/app/google-services.json\`
   - iOS: \`ios/Runner/GoogleService-Info.plist\`
   - Web: Update \`web/index.html\` with your Firebase config

3. Enable the required Firebase services in your Firebase console

## Commands

- \`flutter run\` - Run the app in development mode
- \`flutter build apk\` - Build APK for Android
- \`flutter build ios\` - Build for iOS (requires Xcode)
- \`flutter build web\` - Build for web
- \`flutter test\` - Run tests

## Support

For issues and questions, visit: https://github.com/your-repo/issues
` : `

To add Firebase to this project, follow these steps:
1. Set up a Firebase project
2. Add the Firebase configuration files
3. Update pubspec.yaml with Firebase dependencies
4. Initialize Firebase in your main.dart

## Commands

- \`flutter run\` - Run the app
- \`flutter build apk\` - Build for Android
- \`flutter build ios\` - Build for iOS
- \`flutter test\` - Run tests
`}

Generated with ❤️ using Fluttery
`

  await fs.writeFile(path.join(projectPath, 'README.md'), readmeContent)

  // Generate .gitignore
  const gitignoreContent = `# Miscellaneous
*.class
*.log
*.pyc
*.swp
.DS_Store
.atom/
.buildlog/
.history
.svn/
migrate_working_dir/

# IntelliJ related
*.iml
*.ipr
*.iws
.idea/

# The .vscode folder contains launch configuration and tasks you configure in
# VS Code which you may wish to be included in version control, so this line
# is commented out by default.
#.vscode/

# Flutter/Dart/Pub related
**/doc/api/
**/ios/Flutter/.last_build_id
.dart_tool/
.flutter-plugins
.flutter-plugins-dependencies
.packages
.pub-cache/
.pub/
/build/

# Symbolication related
app.*.symbols

# Obfuscation related
app.*.map.json

# Android Studio will place build artifacts here
/android/app/debug
/android/app/profile
/android/app/release
`

  await fs.writeFile(path.join(projectPath, '.gitignore'), gitignoreContent)

  // Generate launch.json for VS Code
  const vscodeDir = path.join(projectPath, '.vscode')
  await fs.ensureDir(vscodeDir)

  const launchConfig = {
    version: "0.2.0",
    configurations: [
      {
        name: "Flutter",
        type: "dart",
        request: "launch",
        program: "lib/main.dart",
        args: ["--debug"]
      },
      {
        name: "Flutter (Profile)",
        type: "dart",
        request: "launch",
        program: "lib/main.dart",
        args: ["--profile"]
      }
    ]
  }

  await fs.writeFile(
    path.join(vscodeDir, 'launch.json'),
    JSON.stringify(launchConfig, null, 2)
  )
}

function generateProjectConfig(projectName: string, bundleId?: string, firebase?: boolean, platforms?: string[]) {
  const config = {
    name: projectName,
    bundleId: bundleId || `com.example.${projectName.toLowerCase().replace(/\s+/g, '_')}`,
    platforms: platforms || ['android', 'ios'],
    firebase: firebase || false,
    dependencies: [] as string[],
    devDependencies: [
      'flutter_test',
      'flutter_lints'
    ]
  }

  if (firebase) {
    config.dependencies.push(
      'firebase_core',
      'firebase_auth',
      'cloud_firestore'
    )
  }

  return config
}

export default router