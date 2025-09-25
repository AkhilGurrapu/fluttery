import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs-extra'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger'

const execAsync = promisify(exec)

export interface FlutterProject {
  id: string
  name: string
  code: string
  dependencies: string[]
  firebase: boolean
  path: string
}

export interface PreviewOptions {
  width?: number
  height?: number
  device?: 'ios' | 'android' | 'web'
}

export class FlutterEngine {
  private static instance: FlutterEngine
  private projectsDir: string
  private tempDir: string

  private constructor() {
    this.projectsDir = path.join(process.cwd(), 'temp', 'projects')
    this.tempDir = path.join(process.cwd(), 'temp', 'preview')
    this.ensureDirectories()
  }

  static getInstance(): FlutterEngine {
    if (!FlutterEngine.instance) {
      FlutterEngine.instance = new FlutterEngine()
    }
    return FlutterEngine.instance
  }

  private async ensureDirectories(): Promise<void> {
    await fs.ensureDir(this.projectsDir)
    await fs.ensureDir(this.tempDir)
  }

  async createProject(name: string, code: string, dependencies: string[] = [], firebase: boolean = false): Promise<FlutterProject> {
    const projectId = uuidv4()
    const projectPath = path.join(this.projectsDir, projectId)

    try {
      logger.info(`Creating Flutter project: ${name} (${projectId})`)

      // Create Flutter project
      await this.initFlutterProject(projectPath, name)

      // Update pubspec.yaml with dependencies
      await this.updatePubspec(projectPath, name, dependencies, firebase)

      // Write main.dart
      await this.writeMainDart(projectPath, code)

      // Get dependencies
      await this.runPubGet(projectPath)

      const project: FlutterProject = {
        id: projectId,
        name,
        code,
        dependencies,
        firebase,
        path: projectPath
      }

      logger.info(`Flutter project created successfully: ${projectId}`)
      return project

    } catch (error) {
      logger.error(`Error creating Flutter project:`, error)
      // Clean up on error
      await fs.remove(projectPath).catch(() => {})
      throw error
    }
  }

  async updateProject(projectId: string, code: string, dependencies: string[] = []): Promise<void> {
    const projectPath = path.join(this.projectsDir, projectId)

    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectId} not found`)
    }

    try {
      logger.info(`Updating Flutter project: ${projectId}`)

      // Update main.dart
      await this.writeMainDart(projectPath, code)

      // Update dependencies if needed
      const pubspecPath = path.join(projectPath, 'pubspec.yaml')
      const pubspecContent = await fs.readFile(pubspecPath, 'utf8')

      // Simple check if dependencies changed
      const needsUpdate = dependencies.some(dep => !pubspecContent.includes(dep))

      if (needsUpdate) {
        await this.updatePubspec(projectPath, 'temp_project', dependencies, false)
        await this.runPubGet(projectPath)
      }

      logger.info(`Flutter project updated successfully: ${projectId}`)

    } catch (error) {
      logger.error(`Error updating Flutter project:`, error)
      throw error
    }
  }

  async generatePreview(code: string, options: PreviewOptions = {}): Promise<string> {
    const previewId = uuidv4()
    const previewPath = path.join(this.tempDir, previewId)

    try {
      logger.info(`Generating preview: ${previewId}`)

      // Create temporary Flutter project for preview
      await this.initFlutterProject(previewPath, 'preview_app')

      // Update pubspec.yaml
      const dependencies = this.extractDependenciesFromCode(code)
      await this.updatePubspec(previewPath, 'preview_app', dependencies, false)

      // Write code
      await this.writeMainDart(previewPath, code)

      // Get dependencies
      await this.runPubGet(previewPath)

      // Build for web
      const webBuildPath = await this.buildForWeb(previewPath)

      // Copy to preview directory
      const finalPreviewPath = path.join(process.cwd(), 'preview', previewId)
      await fs.copy(webBuildPath, finalPreviewPath)

      // Clean up temp project
      await fs.remove(previewPath)

      logger.info(`Preview generated successfully: ${previewId}`)
      return `/preview/${previewId}/index.html`

    } catch (error) {
      logger.error(`Error generating preview:`, error)
      // Clean up on error
      await fs.remove(previewPath).catch(() => {})
      throw error
    }
  }

  private async initFlutterProject(projectPath: string, name: string): Promise<void> {
    await fs.ensureDir(projectPath)

    // Create basic Flutter project structure
    await fs.ensureDir(path.join(projectPath, 'lib'))
    await fs.ensureDir(path.join(projectPath, 'android'))
    await fs.ensureDir(path.join(projectPath, 'ios'))
    await fs.ensureDir(path.join(projectPath, 'web'))
    await fs.ensureDir(path.join(projectPath, 'test'))

    // Create web/index.html
    const webIndexContent = `<!DOCTYPE html>
<html>
<head>
  <base href="$FLUTTER_BASE_HREF">
  <meta charset="UTF-8">
  <meta content="IE=Edge" http-equiv="X-UA-Compatible">
  <meta name="description" content="Flutter app preview">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <meta name="apple-mobile-web-app-title" content="${name}">
  <link rel="apple-touch-icon" href="icons/Icon-192.png">
  <link rel="icon" type="image/png" href="favicon.png"/>
  <title>${name}</title>
  <link rel="manifest" href="manifest.json">
  <script>
    var serviceWorkerVersion = null;
    var scriptLoaded = false;
    function loadMainDartJs() {
      if (scriptLoaded) {
        return;
      }
      scriptLoaded = true;
      var scriptTag = document.createElement('script');
      scriptTag.src = 'main.dart.js';
      scriptTag.type = 'application/javascript';
      document.body.append(scriptTag);
    }

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('flutter_service_worker.js?v=' + serviceWorkerVersion);
      });
    }
  </script>
</head>
<body>
  <script>
    window.addEventListener('load', function(ev) {
      _flutter.loader.loadEntrypoint({
        serviceWorker: {
          serviceWorkerVersion: serviceWorkerVersion,
        },
        onEntrypointLoaded: function(engineInitializer) {
          engineInitializer.initializeEngine().then(function(appRunner) {
            appRunner.runApp();
          });
        }
      });
    });
  </script>
  <script src="flutter.js" defer></script>
</body>
</html>`

    await fs.writeFile(path.join(projectPath, 'web', 'index.html'), webIndexContent)

    // Create web/manifest.json
    const manifestContent = {
      "name": name,
      "short_name": name,
      "start_url": ".",
      "display": "standalone",
      "background_color": "#0175C2",
      "theme_color": "#0175C2",
      "description": "Flutter app preview",
      "orientation": "portrait-primary",
      "prefer_related_applications": false,
      "icons": [
        {
          "src": "icons/Icon-192.png",
          "sizes": "192x192",
          "type": "image/png"
        }
      ]
    }

    await fs.writeFile(path.join(projectPath, 'web', 'manifest.json'), JSON.stringify(manifestContent, null, 2))
  }

  private async updatePubspec(projectPath: string, name: string, dependencies: string[] = [], firebase: boolean = false): Promise<void> {
    const pubspecContent = `name: ${name.toLowerCase().replace(/\s+/g, '_')}
description: Flutter app generated by Fluttery

publish_to: 'none'

version: 1.0.0+1

environment:
  sdk: '>=3.1.0 <4.0.0'
  flutter: ">=3.13.0"

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.2${dependencies.length > 0 ? '\n  ' + dependencies.map(dep => {
    const depMap: { [key: string]: string } = {
      'http': '^1.1.0',
      'shared_preferences': '^2.2.2',
      'provider': '^6.1.1',
      'flutter_bloc': '^8.1.3',
      'get': '^4.6.6',
      'dio': '^5.3.2',
      'cached_network_image': '^3.3.0',
      'image_picker': '^1.0.4',
      'path_provider': '^2.1.1',
      'sqflite': '^2.3.0',
      'url_launcher': '^6.2.1',
      'webview_flutter': '^4.4.2',
      'camera': '^0.10.5+5',
      'geolocator': '^10.1.0',
      'permission_handler': '^11.1.0',
      'flutter_local_notifications': '^16.3.2',
      'connectivity_plus': '^5.0.1',
      'device_info_plus': '^9.1.1',
      'package_info_plus': '^4.2.0',
      'share_plus': '^7.2.1',
      'cloud_firestore': '^4.13.3',
      'firebase_auth': '^4.15.0',
      'firebase_core': '^2.24.0',
      'firebase_storage': '^11.6.0',
      'firebase_analytics': '^10.7.0',
      'firebase_messaging': '^14.7.6'
    }
    return `${dep}: ${depMap[dep] || '^1.0.0'}`
  }).join('\n  ') : ''}${firebase ? `
  firebase_core: ^2.24.0
  firebase_auth: ^4.15.0
  cloud_firestore: ^4.13.3
  firebase_storage: ^11.6.0` : ''}

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
  assets:
    - assets/images/
  fonts:
    - family: Roboto
      fonts:
        - asset: fonts/Roboto-Regular.ttf
        - asset: fonts/Roboto-Bold.ttf
          weight: 700
`

    await fs.writeFile(path.join(projectPath, 'pubspec.yaml'), pubspecContent)
  }

  private async writeMainDart(projectPath: string, code: string): Promise<void> {
    await fs.writeFile(path.join(projectPath, 'lib', 'main.dart'), code)
  }

  private async runPubGet(projectPath: string): Promise<void> {
    try {
      await execAsync('flutter pub get', { cwd: projectPath })
    } catch (error) {
      logger.error(`Error running pub get:`, error)
      throw error
    }
  }

  private async buildForWeb(projectPath: string): Promise<string> {
    try {
      await execAsync('flutter build web', { cwd: projectPath })
      return path.join(projectPath, 'build', 'web')
    } catch (error) {
      logger.error(`Error building for web:`, error)
      throw error
    }
  }

  private extractDependenciesFromCode(code: string): string[] {
    const dependencies: string[] = []
    const imports = code.match(/import\s+['"](package:.+?)['"];?/g) || []

    for (const imp of imports) {
      const match = imp.match(/package:([^/]+)/)
      if (match && match[1] && !['flutter'].includes(match[1])) {
        dependencies.push(match[1])
      }
    }

    return Array.from(new Set(dependencies))
  }

  async exportProject(projectId: string): Promise<Buffer> {
    const archiver = require('archiver')
    const projectPath = path.join(this.projectsDir, projectId)

    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectId} not found`)
    }

    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } })
      const chunks: Buffer[] = []

      archive.on('data', (chunk: Buffer) => chunks.push(chunk))
      archive.on('end', () => resolve(Buffer.concat(chunks)))
      archive.on('error', reject)

      archive.directory(projectPath, false)
      archive.finalize()
    })
  }

  async cleanupProject(projectId: string): Promise<void> {
    const projectPath = path.join(this.projectsDir, projectId)
    await fs.remove(projectPath)
  }

  async cleanupOldPreviews(): Promise<void> {
    try {
      const previewDir = path.join(process.cwd(), 'preview')
      if (!await fs.pathExists(previewDir)) return

      const files = await fs.readdir(previewDir)
      const now = Date.now()
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours

      for (const file of files) {
        const filePath = path.join(previewDir, file)
        const stats = await fs.stat(filePath)

        if (now - stats.mtimeMs > maxAge) {
          await fs.remove(filePath)
          logger.info(`Cleaned up old preview: ${file}`)
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old previews:', error)
    }
  }
}

export const flutterEngine = FlutterEngine.getInstance()

// Cleanup old previews every hour
setInterval(() => {
  flutterEngine.cleanupOldPreviews().catch(logger.error)
}, 60 * 60 * 1000)