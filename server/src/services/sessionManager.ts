import { v4 as uuidv4 } from 'uuid'
import fs from 'fs-extra'
import path from 'path'
import { exec, spawn, ChildProcess } from 'child_process'
import { promisify } from 'util'
import { logger } from '../utils/logger'
import { aiService } from './aiService'

const execAsync = promisify(exec)

export interface FlutterSession {
  id: string
  userId?: string
  projectPath: string
  port: number
  flutterProcess?: ChildProcess
  createdAt: Date
  lastActive: Date
  status: 'initializing' | 'ready' | 'error' | 'terminated'
  previewUrl: string
}

export class SessionManager {
  private static instance: SessionManager
  private sessions: Map<string, FlutterSession> = new Map()
  private usedPorts: Set<number> = new Set()
  private basePort = 8080
  private maxSessions = 50
  private projectsDir: string

  private constructor() {
    this.projectsDir = path.join(process.cwd(), 'temp', 'sessions')
    this.ensureDirectories()
    this.startCleanupTimer()
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  private async ensureDirectories(): Promise<void> {
    await fs.ensureDir(this.projectsDir)
  }

  private getNextAvailablePort(): number {
    for (let port = this.basePort; port < this.basePort + 1000; port++) {
      if (!this.usedPorts.has(port)) {
        return port
      }
    }
    throw new Error('No available ports for Flutter session')
  }

  async createSession(userId?: string, initialPrompt?: string): Promise<FlutterSession> {
    if (this.sessions.size >= this.maxSessions) {
      throw new Error('Maximum number of sessions reached')
    }

    const sessionId = uuidv4()
    const port = this.getNextAvailablePort()
    const projectPath = path.join(this.projectsDir, sessionId)

    logger.info(`Creating Flutter session: ${sessionId} on port ${port}`)

    const session: FlutterSession = {
      id: sessionId,
      userId,
      projectPath,
      port,
      createdAt: new Date(),
      lastActive: new Date(),
      status: 'initializing',
      previewUrl: `http://localhost:${port}`
    }

    this.sessions.set(sessionId, session)
    this.usedPorts.add(port)

    try {
      // Create Flutter project
      await this.initializeFlutterProject(session, initialPrompt)

      // Start Flutter web server
      await this.startFlutterServer(session)

      session.status = 'ready'
      logger.info(`Flutter session ready: ${sessionId}`)

      return session

    } catch (error) {
      logger.error(`Failed to create session ${sessionId}:`, error)
      session.status = 'error'
      await this.terminateSession(sessionId)
      throw error
    }
  }

  private async initializeFlutterProject(session: FlutterSession, initialPrompt?: string): Promise<void> {
    const { projectPath, id: sessionId } = session

    // Create basic Flutter project with valid Dart package name
    const projectName = `flutter_app_${sessionId.replace(/-/g, '_')}`
    await execAsync(`flutter create ${projectPath} --project-name ${projectName}`, { timeout: 30000 })

    // Generate initial code based on prompt
    if (initialPrompt) {
      logger.info(`Generating initial code for session ${sessionId}: "${initialPrompt}"`)

      try {
        const result = await aiService.generateFlutterCode({
          prompt: initialPrompt,
          projectContext: {
            name: 'flutter_app',
            dependencies: [],
            firebase: false
          }
        })

        // Update main.dart with generated code
        const mainDartPath = path.join(projectPath, 'lib', 'main.dart')
        await fs.writeFile(mainDartPath, result.code, 'utf8')

        // Update pubspec.yaml if dependencies are needed
        if (result.dependencies && result.dependencies.length > 0) {
          await this.updatePubspec(projectPath, result.dependencies)
          await execAsync('flutter pub get', { cwd: projectPath })
        }

        logger.info(`Initial code generated for session ${sessionId}`)
      } catch (aiError) {
        logger.warn(`Failed to generate initial code for session ${sessionId}, using default template:`, aiError)
        // Continue with default Flutter template
      }
    }
  }

  private async updatePubspec(projectPath: string, dependencies: string[]): Promise<void> {
    const pubspecPath = path.join(projectPath, 'pubspec.yaml')
    let pubspecContent = await fs.readFile(pubspecPath, 'utf8')

    // Simple dependency injection (this could be more sophisticated)
    const dependencyMap: { [key: string]: string } = {
      'http': '^1.1.0',
      'provider': '^6.1.1',
      'shared_preferences': '^2.2.2',
      'firebase_core': '^2.24.0',
      'firebase_auth': '^4.15.0',
      'cloud_firestore': '^4.13.3'
    }

    for (const dep of dependencies) {
      if (dependencyMap[dep] && !pubspecContent.includes(dep)) {
        pubspecContent = pubspecContent.replace(
          'dependencies:',
          `dependencies:\n  ${dep}: ${dependencyMap[dep]}`
        )
      }
    }

    await fs.writeFile(pubspecPath, pubspecContent, 'utf8')
  }

  private async startFlutterServer(session: FlutterSession): Promise<void> {
    const { projectPath, port, id: sessionId } = session

    return new Promise((resolve, reject) => {
      const flutterProcess = spawn('flutter', ['run', '-d', 'web-server', '--web-port', port.toString()], {
        cwd: projectPath,
        stdio: ['pipe', 'pipe', 'pipe']
      })

      session.flutterProcess = flutterProcess

      let serverStarted = false
      const timeout = setTimeout(() => {
        if (!serverStarted) {
          reject(new Error(`Flutter server timeout for session ${sessionId}`))
        }
      }, 120000) // 120 second timeout for initial startup

      flutterProcess.stdout?.on('data', (data) => {
        const output = data.toString()
        logger.debug(`Flutter ${sessionId} stdout: ${output}`)

        if (output.includes(`is being served at http://localhost:${port}`) && !serverStarted) {
          serverStarted = true
          clearTimeout(timeout)
          resolve()
        }
      })

      flutterProcess.stderr?.on('data', (data) => {
        const error = data.toString()
        logger.warn(`Flutter ${sessionId} stderr: ${error}`)
      })

      flutterProcess.on('exit', (code) => {
        logger.info(`Flutter process for session ${sessionId} exited with code ${code}`)
        session.status = 'terminated'
      })

      flutterProcess.on('error', (error) => {
        logger.error(`Flutter process error for session ${sessionId}:`, error)
        if (!serverStarted) {
          clearTimeout(timeout)
          reject(error)
        }
      })
    })
  }

  async updateSessionCode(sessionId: string, prompt: string): Promise<{ success: boolean; files?: any[] }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    session.lastActive = new Date()

    try {
      logger.info(`Updating code for session ${sessionId}: "${prompt}"`)

      // Read current main.dart
      const mainDartPath = path.join(session.projectPath, 'lib', 'main.dart')
      const currentCode = await fs.readFile(mainDartPath, 'utf8')

      // Generate new code with Gemini
      const result = await aiService.generateFlutterCode({
        prompt,
        currentCode,
        projectContext: {
          name: 'flutter_app',
          dependencies: [],
          firebase: false
        }
      })

      // Update files
      if (result.files && result.files.length > 0) {
        for (const file of result.files) {
          const filePath = path.join(session.projectPath, file.path)
          await fs.ensureDir(path.dirname(filePath))
          await fs.writeFile(filePath, file.content, 'utf8')
        }
      } else {
        // Fallback: update main.dart
        await fs.writeFile(mainDartPath, result.code, 'utf8')
      }

      // Update dependencies if needed
      if (result.dependencies && result.dependencies.length > 0) {
        await this.updatePubspec(session.projectPath, result.dependencies)
        await execAsync('flutter pub get', { cwd: session.projectPath })
      }

      // Trigger hot reload
      await this.hotReload(sessionId)

      logger.info(`Code updated successfully for session ${sessionId}`)

      return { success: true, files: result.files }

    } catch (error) {
      logger.error(`Failed to update code for session ${sessionId}:`, error)
      throw error
    }
  }

  private async hotReload(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session || !session.flutterProcess) {
      throw new Error(`Session ${sessionId} not found or no active Flutter process`)
    }

    // Send hot reload command to Flutter process
    session.flutterProcess.stdin?.write('r\n')
    logger.info(`Hot reload triggered for session ${sessionId}`)
  }

  async getSession(sessionId: string): Promise<FlutterSession | undefined> {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.lastActive = new Date()
    }
    return session
  }

  async listSessions(): Promise<FlutterSession[]> {
    return Array.from(this.sessions.values())
  }

  async terminateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return
    }

    logger.info(`Terminating session ${sessionId}`)

    // Kill Flutter process
    if (session.flutterProcess) {
      session.flutterProcess.kill('SIGTERM')
      setTimeout(() => {
        if (session.flutterProcess && !session.flutterProcess.killed) {
          session.flutterProcess.kill('SIGKILL')
        }
      }, 5000)
    }

    // Clean up project directory
    try {
      await fs.remove(session.projectPath)
    } catch (error) {
      logger.warn(`Failed to remove project directory for session ${sessionId}:`, error)
    }

    // Free up port
    this.usedPorts.delete(session.port)

    // Remove from sessions
    this.sessions.delete(sessionId)

    logger.info(`Session ${sessionId} terminated`)
  }

  private startCleanupTimer(): void {
    // Clean up inactive sessions every 10 minutes
    setInterval(async () => {
      const now = new Date()
      const inactiveThreshold = 60 * 60 * 1000 // 1 hour

      for (const [sessionId, session] of this.sessions) {
        if (now.getTime() - session.lastActive.getTime() > inactiveThreshold) {
          logger.info(`Cleaning up inactive session: ${sessionId}`)
          await this.terminateSession(sessionId)
        }
      }
    }, 10 * 60 * 1000)
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down session manager...')

    const shutdownPromises = Array.from(this.sessions.keys()).map(sessionId =>
      this.terminateSession(sessionId)
    )

    await Promise.all(shutdownPromises)
    logger.info('All sessions terminated')
  }
}

export const sessionManager = SessionManager.getInstance()

// Graceful shutdown
process.on('SIGTERM', () => sessionManager.shutdown())
process.on('SIGINT', () => sessionManager.shutdown())