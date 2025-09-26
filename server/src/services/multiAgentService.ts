import { MasterOrchestratorAgent } from '../agents/MasterOrchestratorAgent'
import { AgentMessage, AgentContext, agentBus } from '../agents/shared/AgentCommunication'
import { logger } from '../utils/logger'
import { SessionManager } from './sessionManager'
import fs from 'fs/promises'
import path from 'path'

export interface MultiAgentSession {
  sessionId: string
  orchestrator: MasterOrchestratorAgent
  context: AgentContext
  status: 'initializing' | 'planning' | 'executing' | 'integrating' | 'completed' | 'failed'
  startTime: Date
  lastActivity: Date
  progress: {
    currentPhase: string
    completedPlans: number
    totalPlans: number
    currentAgent: string | null
  }
}

export class MultiAgentService {
  private sessions = new Map<string, MultiAgentSession>()
  private sessionManager: SessionManager

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager
    logger.info('Multi-Agent Service initialized')
  }

  async createSession(sessionId: string, userPrompt: string): Promise<MultiAgentSession> {
    logger.info(`Multi-Agent Service: Creating session ${sessionId}`)

    const orchestrator = new MasterOrchestratorAgent()

    const context: AgentContext = {
      sessionId,
      projectContext: {
        userPrompt,
        createdAt: new Date(),
        requirements: this.extractRequirements(userPrompt)
      },
      conversationHistory: [],
      currentPhase: 'initialization',
      metadata: {
        userPrompt,
        startTime: new Date()
      }
    }

    const session: MultiAgentSession = {
      sessionId,
      orchestrator,
      context,
      status: 'initializing',
      startTime: new Date(),
      lastActivity: new Date(),
      progress: {
        currentPhase: 'initialization',
        completedPlans: 0,
        totalPlans: 0,
        currentAgent: null
      }
    }

    this.sessions.set(sessionId, session)

    // Update agent communication bus context
    agentBus.updateContext(sessionId, context)

    logger.info(`Multi-Agent Service: Session ${sessionId} created successfully`)
    return session
  }

  async processUserPrompt(sessionId: string, userPrompt: string): Promise<any> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    session.status = 'planning'
    session.lastActivity = new Date()
    session.progress.currentPhase = 'planning'

    logger.info(`Multi-Agent Service: Processing prompt for session ${sessionId}`)

    try {
      // Create agent message for orchestrator
      const message: AgentMessage = {
        id: `msg_${Date.now()}`,
        agentId: 'master-orchestrator',
        type: 'request',
        payload: {
          action: 'build_app',
          userPrompt,
          context: session.context
        },
        timestamp: new Date(),
        sessionId
      }

      // Update conversation history
      session.context.conversationHistory.push(message)

      // Process through orchestrator
      const result = await session.orchestrator.processMessage(message)

      if (result.success) {
        session.status = 'executing'
        session.progress.currentPhase = 'execution'

        if (result.data && result.data.plans) {
          session.progress.totalPlans = result.data.plans.length
        }

        // Continue with execution automatically
        return await this.continueExecution(sessionId)
      } else {
        session.status = 'failed'
        logger.error(`Multi-Agent Service: Session ${sessionId} failed:`, result.error)

        return {
          success: false,
          error: result.error,
          sessionId,
          status: session.status
        }
      }
    } catch (error) {
      session.status = 'failed'
      logger.error(`Multi-Agent Service: Error processing prompt for session ${sessionId}:`, error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId,
        status: session.status
      }
    }
  }

  async continueExecution(sessionId: string): Promise<any> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    session.lastActivity = new Date()

    try {
      const message: AgentMessage = {
        id: `continue_${Date.now()}`,
        agentId: 'master-orchestrator',
        type: 'request',
        payload: {
          action: 'continue_execution',
          context: session.context
        },
        timestamp: new Date(),
        sessionId
      }

      const result = await session.orchestrator.processMessage(message)

      if (result.success && result.data) {
        // Update progress based on orchestrator state
        const orchestratorState = session.orchestrator.getCurrentState()
        session.progress.currentPhase = orchestratorState.currentPhase
        session.progress.completedPlans = orchestratorState.plans.filter(p => p.status === 'completed').length
        session.progress.totalPlans = orchestratorState.plans.length
        session.progress.currentAgent = orchestratorState.plans.find(p => p.status === 'in_progress')?.agentId || null

        if (orchestratorState.currentPhase === 'completion' && orchestratorState.finalResult) {
          session.status = 'completed'

          // Generate Flutter project files
          await this.generateFlutterProject(sessionId, orchestratorState.finalResult)

          return {
            success: true,
            data: orchestratorState.finalResult,
            sessionId,
            status: session.status,
            progress: session.progress,
            flutterProjectGenerated: true
          }
        } else {
          session.status = 'executing'

          return {
            success: true,
            data: result.data,
            sessionId,
            status: session.status,
            progress: session.progress,
            nextSteps: result.nextSteps
          }
        }
      } else {
        session.status = 'failed'

        return {
          success: false,
          error: result.error,
          sessionId,
          status: session.status
        }
      }
    } catch (error) {
      session.status = 'failed'
      logger.error(`Multi-Agent Service: Error continuing execution for session ${sessionId}:`, error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId,
        status: session.status
      }
    }
  }

  private async generateFlutterProject(sessionId: string, agentResult: any): Promise<void> {
    try {
      logger.info(`Multi-Agent Service: Generating Flutter project for session ${sessionId}`)

      // Ensure session has Flutter project directory
      await this.sessionManager.ensureSession(sessionId)

      const sessionPath = this.sessionManager.getSessionPath(sessionId)
      const libPath = path.join(sessionPath, 'lib')

      // Generate files from code agent result
      if (agentResult.code && agentResult.code.files) {
        for (const file of agentResult.code.files) {
          const filePath = path.join(sessionPath, file.path)
          const fileDir = path.dirname(filePath)

          // Ensure directory exists
          await fs.mkdir(fileDir, { recursive: true })

          // Write file content
          await fs.writeFile(filePath, file.content, 'utf-8')
          logger.info(`Multi-Agent Service: Generated file ${file.path}`)
        }
      }

      // Update pubspec.yaml with dependencies
      if (agentResult.code && agentResult.code.dependencies) {
        await this.updatePubspecDependencies(sessionPath, agentResult.code.dependencies)
      }

      // Generate test files
      if (agentResult.tests && agentResult.tests.testSuite) {
        await this.generateTestFiles(sessionPath, agentResult.tests.testSuite)
      }

      // Trigger hot reload
      await this.sessionManager.hotReload(sessionId)

      logger.info(`Multi-Agent Service: Flutter project generated successfully for session ${sessionId}`)
    } catch (error) {
      logger.error(`Multi-Agent Service: Error generating Flutter project for session ${sessionId}:`, error)
      throw error
    }
  }

  private async updatePubspecDependencies(sessionPath: string, dependencies: any[]): Promise<void> {
    const pubspecPath = path.join(sessionPath, 'pubspec.yaml')

    try {
      let pubspecContent = await fs.readFile(pubspecPath, 'utf-8')

      // Simple dependency injection (could be improved with YAML parser)
      let dependenciesSection = 'dependencies:\n  flutter:\n    sdk: flutter\n'
      let devDependenciesSection = 'dev_dependencies:\n  flutter_test:\n    sdk: flutter\n'

      for (const dep of dependencies) {
        if (dep.dev) {
          devDependenciesSection += `  ${dep.name}: ${dep.version}\n`
        } else {
          dependenciesSection += `  ${dep.name}: ${dep.version}\n`
        }
      }

      // Replace dependencies section
      pubspecContent = pubspecContent.replace(
        /dependencies:[\s\S]*?(?=dev_dependencies:|$)/,
        dependenciesSection + '\n'
      )

      pubspecContent = pubspecContent.replace(
        /dev_dependencies:[\s\S]*?(?=flutter:|$)/,
        devDependenciesSection + '\n'
      )

      await fs.writeFile(pubspecPath, pubspecContent, 'utf-8')
      logger.info('Multi-Agent Service: Updated pubspec.yaml with new dependencies')
    } catch (error) {
      logger.error('Multi-Agent Service: Error updating pubspec.yaml:', error)
    }
  }

  private async generateTestFiles(sessionPath: string, testSuite: any): Promise<void> {
    const testDir = path.join(sessionPath, 'test')

    try {
      // Ensure test directory exists
      await fs.mkdir(testDir, { recursive: true })

      // Generate unit tests
      if (testSuite.unitTests) {
        for (const test of testSuite.unitTests) {
          const testPath = path.join(sessionPath, test.file)
          const testDirPath = path.dirname(testPath)

          await fs.mkdir(testDirPath, { recursive: true })
          await fs.writeFile(testPath, test.content, 'utf-8')
          logger.info(`Multi-Agent Service: Generated test file ${test.file}`)
        }
      }

      // Generate widget tests
      if (testSuite.widgetTests) {
        for (const test of testSuite.widgetTests) {
          const testPath = path.join(sessionPath, test.file)
          const testDirPath = path.dirname(testPath)

          await fs.mkdir(testDirPath, { recursive: true })
          await fs.writeFile(testPath, test.content, 'utf-8')
          logger.info(`Multi-Agent Service: Generated widget test ${test.file}`)
        }
      }

      // Generate integration tests
      if (testSuite.integrationTests) {
        const integrationDir = path.join(sessionPath, 'integration_test')
        await fs.mkdir(integrationDir, { recursive: true })

        for (const test of testSuite.integrationTests) {
          const testPath = path.join(sessionPath, test.file)
          const testDirPath = path.dirname(testPath)

          await fs.mkdir(testDirPath, { recursive: true })
          await fs.writeFile(testPath, test.content, 'utf-8')
          logger.info(`Multi-Agent Service: Generated integration test ${test.file}`)
        }
      }
    } catch (error) {
      logger.error('Multi-Agent Service: Error generating test files:', error)
    }
  }

  getSession(sessionId: string): MultiAgentSession | undefined {
    return this.sessions.get(sessionId)
  }

  getSessionProgress(sessionId: string): any {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return null
    }

    return {
      sessionId,
      status: session.status,
      progress: session.progress,
      startTime: session.startTime,
      lastActivity: session.lastActivity,
      orchestratorState: session.orchestrator.getCurrentState()
    }
  }

  async cleanupSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) {
      // Reset orchestrator state
      session.orchestrator.resetState()
      this.sessions.delete(sessionId)
      logger.info(`Multi-Agent Service: Cleaned up session ${sessionId}`)
    }
  }

  private extractRequirements(userPrompt: string): any {
    // Extract requirements from user prompt for better planning
    const requirements = {
      type: 'mobile_app',
      platform: 'flutter',
      features: [] as string[],
      complexity: 'medium',
      authentication: false,
      database: false,
      ui_style: 'material'
    }

    const prompt = userPrompt.toLowerCase()

    // Feature detection
    if (prompt.includes('auth') || prompt.includes('login')) {
      requirements.features.push('authentication')
      requirements.authentication = true
    }

    if (prompt.includes('firebase') || prompt.includes('database')) {
      requirements.features.push('database')
      requirements.database = true
    }

    if (prompt.includes('todo') || prompt.includes('task')) {
      requirements.features.push('task_management')
    }

    if (prompt.includes('chat') || prompt.includes('message')) {
      requirements.features.push('messaging')
    }

    if (prompt.includes('ecommerce') || prompt.includes('shop')) {
      requirements.features.push('ecommerce')
      requirements.complexity = 'high'
    }

    // Complexity assessment
    if (requirements.features.length > 3) {
      requirements.complexity = 'high'
    } else if (requirements.features.length === 0) {
      requirements.complexity = 'low'
    }

    return requirements
  }

  // Get all active sessions
  getActiveSessions(): MultiAgentSession[] {
    return Array.from(this.sessions.values()).filter(s =>
      s.status !== 'completed' && s.status !== 'failed'
    )
  }

  // Get session statistics
  getSessionStats(): any {
    const sessions = Array.from(this.sessions.values())

    return {
      total: sessions.length,
      active: sessions.filter(s => s.status !== 'completed' && s.status !== 'failed').length,
      completed: sessions.filter(s => s.status === 'completed').length,
      failed: sessions.filter(s => s.status === 'failed').length,
      byStatus: {
        initializing: sessions.filter(s => s.status === 'initializing').length,
        planning: sessions.filter(s => s.status === 'planning').length,
        executing: sessions.filter(s => s.status === 'executing').length,
        integrating: sessions.filter(s => s.status === 'integrating').length,
        completed: sessions.filter(s => s.status === 'completed').length,
        failed: sessions.filter(s => s.status === 'failed').length
      }
    }
  }
}