import { BaseAgent, AgentResult } from './shared/BaseAgent'
import { AgentMessage, AgentContext, agentBus } from './shared/AgentCommunication'
import { DesignAgent } from './specialists/DesignAgent'
import { CodeAgent } from './specialists/CodeAgent'
import { TestingAgent } from './specialists/TestingAgent'
import { logger } from '../utils/logger'

interface ReWOOPlan {
  id: string
  type: 'design' | 'code' | 'test' | 'integrate'
  agentId: string
  dependencies: string[]
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  result?: any
  error?: string
}

interface OrchestratorState {
  currentPhase: string
  plans: ReWOOPlan[]
  context: any
  finalResult: any
}

const ORCHESTRATOR_SYSTEM_PROMPT = `You are the Master Orchestrator Agent for Flutter app development. You coordinate specialized agents using the ReWOO (Reasoning without Observation) pattern.

Your responsibilities:
1. PLAN: Break down user requirements into specialized agent tasks
2. EXECUTE: Coordinate agents in the correct order with dependencies
3. INTEGRATE: Combine results from all agents into complete Flutter application
4. VALIDATE: Ensure quality and completeness of final output

Available Specialized Agents:
- design-agent: UI/UX design and Material Design 3 specifications
- code-agent: Flutter code generation and architecture
- testing-agent: Test suite generation and quality assurance

RESPONSE FORMAT:
Always respond with a JSON object containing:
{
  "phase": "planning" | "execution" | "integration" | "completion",
  "plans": [
    {
      "id": "unique_plan_id",
      "type": "design" | "code" | "test",
      "agentId": "agent_name",
      "dependencies": ["plan_ids"],
      "action": "specific_action",
      "payload": { /* agent-specific data */ }
    }
  ],
  "nextSteps": ["Description of next actions"],
  "status": "in_progress" | "completed" | "failed",
  "explanation": "Current progress and reasoning"
}`

export class MasterOrchestratorAgent extends BaseAgent {
  private designAgent: DesignAgent
  private codeAgent: CodeAgent
  private testingAgent: TestingAgent
  private state: OrchestratorState

  constructor() {
    super('master-orchestrator', {
      canGenerateCode: true,
      canAnalyzeDesign: true,
      canRunTests: true,
      canOptimize: true,
      canDeploy: false
    }, ORCHESTRATOR_SYSTEM_PROMPT)

    // Initialize specialized agents
    this.designAgent = new DesignAgent()
    this.codeAgent = new CodeAgent()
    this.testingAgent = new TestingAgent()

    // Register agents in communication bus
    agentBus.registerAgent('design-agent', this.designAgent)
    agentBus.registerAgent('code-agent', this.codeAgent)
    agentBus.registerAgent('testing-agent', this.testingAgent)

    this.state = {
      currentPhase: 'planning',
      plans: [],
      context: {},
      finalResult: null
    }

    logger.info('Master Orchestrator Agent initialized with specialized agents')
  }

  async processMessage(message: AgentMessage): Promise<AgentResult> {
    try {
      const { payload } = message
      const context = payload.context as AgentContext

      logger.info(`Master Orchestrator: Processing ${payload.action} in ${this.state.currentPhase} phase`)

      switch (payload.action) {
        case 'build_app':
          return await this.buildApplication(payload.userPrompt, context)
        case 'continue_execution':
          return await this.continueExecution(context)
        default:
          throw new Error(`Unknown action: ${payload.action}`)
      }
    } catch (error) {
      logger.error('Master Orchestrator error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Orchestration failed',
        confidence: 0
      }
    }
  }

  private async buildApplication(userPrompt: string, context: AgentContext): Promise<AgentResult> {
    // Phase 1: Planning
    this.state.currentPhase = 'planning'
    const planningResult = await this.createExecutionPlan(userPrompt, context)

    if (!planningResult.success) {
      return planningResult
    }

    // Phase 2: Execution
    this.state.currentPhase = 'execution'
    const executionResult = await this.executeReWOOPlan(context)

    if (!executionResult.success) {
      return executionResult
    }

    // Phase 3: Integration
    this.state.currentPhase = 'integration'
    const integrationResult = await this.integrateResults(context)

    return integrationResult
  }

  private async createExecutionPlan(userPrompt: string, context: AgentContext): Promise<AgentResult> {
    const prompt = `Create a ReWOO execution plan for building a Flutter app:

USER REQUEST: ${userPrompt}

Create a comprehensive plan with these phases:
1. DESIGN: Create UI/UX design specifications
2. CODE: Generate Flutter code based on design
3. TEST: Create comprehensive test suite
4. INTEGRATE: Combine all components

Consider dependencies between tasks and optimal execution order.`

    try {
      const planningResponse = await this.callGemini(prompt, context)

      if (planningResponse.plans) {
        this.state.plans = planningResponse.plans.map((plan: any) => ({
          ...plan,
          status: 'pending'
        }))

        this.state.context = {
          userPrompt,
          projectRequirements: this.extractRequirements(userPrompt)
        }

        logger.info(`Master Orchestrator: Created ${this.state.plans.length} execution plans`)

        return {
          success: true,
          data: {
            phase: 'planning',
            plans: this.state.plans,
            status: 'completed'
          },
          confidence: 0.9
        }
      }

      throw new Error('Failed to create execution plans')
    } catch (error) {
      logger.error('Planning phase error:', error)
      return {
        success: false,
        error: 'Failed to create execution plan',
        confidence: 0
      }
    }
  }

  private async executeReWOOPlan(context: AgentContext): Promise<AgentResult> {
    const results: any[] = []

    // Execute plans in dependency order
    const sortedPlans = this.sortPlansByDependencies(this.state.plans)

    for (const plan of sortedPlans) {
      logger.info(`Master Orchestrator: Executing plan ${plan.id} with agent ${plan.agentId}`)

      try {
        plan.status = 'in_progress'

        // Prepare agent-specific message
        const agentMessage: AgentMessage = {
          id: `${plan.id}_${Date.now()}`,
          agentId: plan.agentId,
          type: 'request',
          payload: {
            action: this.getAgentAction(plan.type),
            context,
            ...this.buildAgentPayload(plan, results)
          },
          timestamp: new Date(),
          sessionId: context.sessionId
        }

        const agentResult = await agentBus.sendMessage(agentMessage)

        if (agentResult.success) {
          plan.status = 'completed'
          plan.result = agentResult.data
          results.push({
            planId: plan.id,
            agentId: plan.agentId,
            type: plan.type,
            result: agentResult.data
          })

          logger.info(`Master Orchestrator: Plan ${plan.id} completed successfully`)
        } else {
          plan.status = 'failed'
          plan.error = agentResult.error
          logger.error(`Master Orchestrator: Plan ${plan.id} failed:`, agentResult.error)

          return {
            success: false,
            error: `Agent ${plan.agentId} failed: ${agentResult.error}`,
            confidence: 0
          }
        }
      } catch (error) {
        plan.status = 'failed'
        plan.error = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`Master Orchestrator: Plan ${plan.id} execution error:`, error)

        return {
          success: false,
          error: `Plan execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          confidence: 0
        }
      }
    }

    return {
      success: true,
      data: {
        phase: 'execution',
        results,
        status: 'completed'
      },
      confidence: 0.85
    }
  }

  private async integrateResults(context: AgentContext): Promise<AgentResult> {
    const designResult = this.getResultByType('design')
    const codeResult = this.getResultByType('code')
    const testResult = this.getResultByType('test')

    // Integrate all results into final Flutter application structure
    const integratedResult = {
      project: {
        name: this.generateProjectName(this.state.context.userPrompt),
        description: this.state.context.userPrompt,
        version: '1.0.0'
      },
      design: designResult?.result || null,
      code: codeResult?.result || null,
      tests: testResult?.result || null,
      metadata: {
        generatedAt: new Date().toISOString(),
        agentsUsed: this.state.plans.map(p => p.agentId),
        totalPlans: this.state.plans.length,
        successfulPlans: this.state.plans.filter(p => p.status === 'completed').length
      }
    }

    this.state.finalResult = integratedResult
    this.state.currentPhase = 'completion'

    logger.info('Master Orchestrator: Integration completed successfully')

    return {
      success: true,
      data: integratedResult,
      confidence: 0.9,
      nextSteps: [
        'Flutter project files have been generated',
        'Test suite is ready for execution',
        'Code can be exported for deployment',
        'Firebase integration can be added'
      ]
    }
  }

  private async continueExecution(context: AgentContext): Promise<AgentResult> {
    // Continue from current state
    switch (this.state.currentPhase) {
      case 'execution':
        return await this.executeReWOOPlan(context)
      case 'integration':
        return await this.integrateResults(context)
      default:
        return {
          success: false,
          error: 'No continuation available for current phase',
          confidence: 0
        }
    }
  }

  // Helper methods
  private extractRequirements(userPrompt: string): any {
    // Extract key requirements from user prompt
    const requirements = {
      appType: 'mobile',
      platform: 'flutter',
      features: [],
      complexity: 'medium'
    }

    // Simple keyword extraction
    if (userPrompt.toLowerCase().includes('auth')) requirements.features.push('authentication')
    if (userPrompt.toLowerCase().includes('firebase')) requirements.features.push('firebase')
    if (userPrompt.toLowerCase().includes('todo')) requirements.features.push('task_management')
    if (userPrompt.toLowerCase().includes('chat')) requirements.features.push('messaging')

    return requirements
  }

  private sortPlansByDependencies(plans: ReWOOPlan[]): ReWOOPlan[] {
    const sorted: ReWOOPlan[] = []
    const processed = new Set<string>()

    const addPlan = (plan: ReWOOPlan) => {
      if (processed.has(plan.id)) return

      // Add dependencies first
      for (const depId of plan.dependencies) {
        const depPlan = plans.find(p => p.id === depId)
        if (depPlan && !processed.has(depId)) {
          addPlan(depPlan)
        }
      }

      sorted.push(plan)
      processed.add(plan.id)
    }

    for (const plan of plans) {
      addPlan(plan)
    }

    return sorted
  }

  private getAgentAction(planType: string): string {
    switch (planType) {
      case 'design': return 'create_design'
      case 'code': return 'generate_code'
      case 'test': return 'generate_tests'
      default: return 'process'
    }
  }

  private buildAgentPayload(plan: ReWOOPlan, previousResults: any[]): any {
    const basePayload = {
      requirements: this.state.context.projectRequirements,
      userPrompt: this.state.context.userPrompt
    }

    // Add results from dependencies
    const dependencyResults = previousResults.filter(r =>
      plan.dependencies.includes(r.planId)
    )

    switch (plan.type) {
      case 'design':
        return {
          ...basePayload,
          requirements: {
            ...this.state.context.projectRequirements,
            description: this.state.context.userPrompt
          }
        }

      case 'code':
        const designResult = dependencyResults.find(r => r.type === 'design')
        return {
          ...basePayload,
          design: designResult?.result,
          requirements: this.state.context.projectRequirements
        }

      case 'test':
        const codeResult = dependencyResults.find(r => r.type === 'code')
        return {
          ...basePayload,
          codebase: codeResult?.result,
          testRequirements: {
            coverage: 80,
            types: ['unit', 'widget', 'integration'],
            performance: true,
            accessibility: true
          }
        }

      default:
        return basePayload
    }
  }

  private getResultByType(type: string): any {
    return this.state.plans.find(p => p.type === type && p.status === 'completed')
  }

  private generateProjectName(prompt: string): string {
    // Generate a simple project name from the prompt
    const words = prompt.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 3)

    return words.join('_') || 'flutter_app'
  }

  // Public methods for external access
  getCurrentState(): OrchestratorState {
    return { ...this.state }
  }

  resetState(): void {
    this.state = {
      currentPhase: 'planning',
      plans: [],
      context: {},
      finalResult: null
    }
  }
}