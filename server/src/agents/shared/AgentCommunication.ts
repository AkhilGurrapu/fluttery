import { logger } from '../../utils/logger'

export interface AgentMessage {
  id: string
  agentId: string
  type: 'request' | 'response' | 'error' | 'progress'
  payload: any
  timestamp: Date
  sessionId: string
}

export interface AgentContext {
  sessionId: string
  userId?: string
  projectContext: any
  conversationHistory: AgentMessage[]
  currentPhase: string
  metadata: Record<string, any>
}

export class AgentCommunicationBus {
  private agents: Map<string, any> = new Map()
  private messageHistory: AgentMessage[] = []
  private contexts: Map<string, AgentContext> = new Map()

  constructor() {
    logger.info('Agent Communication Bus initialized')
  }

  registerAgent(agentId: string, agent: any): void {
    this.agents.set(agentId, agent)
    logger.info(`Agent registered: ${agentId}`)
  }

  async sendMessage(message: AgentMessage): Promise<any> {
    this.messageHistory.push(message)

    const targetAgent = this.agents.get(message.agentId)
    if (!targetAgent) {
      throw new Error(`Agent ${message.agentId} not found`)
    }

    logger.info(`Sending message to ${message.agentId}: ${message.type}`)

    try {
      const response = await targetAgent.processMessage(message)

      const responseMessage: AgentMessage = {
        id: `${message.id}_response`,
        agentId: message.agentId,
        type: 'response',
        payload: response,
        timestamp: new Date(),
        sessionId: message.sessionId
      }

      this.messageHistory.push(responseMessage)
      return response
    } catch (error) {
      logger.error(`Error in agent ${message.agentId}:`, error)

      const errorMessage: AgentMessage = {
        id: `${message.id}_error`,
        agentId: message.agentId,
        type: 'error',
        payload: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date(),
        sessionId: message.sessionId
      }

      this.messageHistory.push(errorMessage)
      throw error
    }
  }

  getContext(sessionId: string): AgentContext | undefined {
    return this.contexts.get(sessionId)
  }

  updateContext(sessionId: string, updates: Partial<AgentContext>): void {
    const existing = this.contexts.get(sessionId) || {
      sessionId,
      conversationHistory: [],
      currentPhase: 'initialization',
      metadata: {},
      projectContext: {}
    }

    this.contexts.set(sessionId, { ...existing, ...updates })
  }

  getMessageHistory(sessionId: string): AgentMessage[] {
    return this.messageHistory.filter(msg => msg.sessionId === sessionId)
  }
}

export const agentBus = new AgentCommunicationBus()