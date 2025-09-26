import { GoogleGenAI } from '@google/genai'
import { logger } from '../../utils/logger'
import { AgentMessage, AgentContext } from './AgentCommunication'

export interface AgentCapabilities {
  canGenerateCode: boolean
  canAnalyzeDesign: boolean
  canRunTests: boolean
  canOptimize: boolean
  canDeploy: boolean
}

export interface AgentResult {
  success: boolean
  data?: any
  error?: string
  nextSteps?: string[]
  confidence: number
}

export abstract class BaseAgent {
  protected agentId: string
  protected capabilities: AgentCapabilities
  protected geminiAI: any
  protected systemPrompt: string
  protected modelName: string

  constructor(agentId: string, capabilities: AgentCapabilities, systemPrompt: string) {
    this.agentId = agentId
    this.capabilities = capabilities
    this.systemPrompt = systemPrompt
    this.modelName = 'gemini-2.0-flash-exp' // Using the working model

    // Initialize with new SDK
    this.geminiAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || ''
    })

    logger.info(`${this.agentId} agent initialized with model ${this.modelName}`)
  }

  abstract processMessage(message: AgentMessage): Promise<AgentResult>

  protected async callGemini(prompt: string, context?: AgentContext): Promise<any> {
    const fullPrompt = this.buildPrompt(prompt, context)

    try {
      logger.info(`${this.agentId}: Calling Gemini with prompt length: ${fullPrompt.length}`)

      // Use new SDK API
      const result = await this.geminiAI.models.generateContent({
        model: this.modelName,
        contents: fullPrompt,
        config: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192
        }
      })

      const text = result.text
      logger.info(`${this.agentId}: Received response from Gemini`)

      // Try to parse JSON response, fallback to text
      try {
        return JSON.parse(text)
      } catch {
        return { content: text, raw: true }
      }
    } catch (error) {
      logger.error(`${this.agentId}: Gemini API error:`, error)
      throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private buildPrompt(userPrompt: string, context?: AgentContext): string {
    let prompt = `${this.systemPrompt}\n\n`

    if (context) {
      prompt += `SESSION CONTEXT:\n`
      prompt += `- Session ID: ${context.sessionId}\n`
      prompt += `- Current Phase: ${context.currentPhase}\n`
      prompt += `- Project Context: ${JSON.stringify(context.projectContext, null, 2)}\n`

      if (context.conversationHistory.length > 0) {
        prompt += `- Previous Messages: ${context.conversationHistory.slice(-3).map(msg =>
          `${msg.agentId}: ${JSON.stringify(msg.payload)}`
        ).join('\n')}\n`
      }

      prompt += `\n`
    }

    prompt += `USER REQUEST:\n${userPrompt}\n`

    return prompt
  }

  protected validateResult(result: any): AgentResult {
    if (!result) {
      return {
        success: false,
        error: 'No result generated',
        confidence: 0
      }
    }

    return {
      success: true,
      data: result,
      confidence: 0.8
    }
  }

  getCapabilities(): AgentCapabilities {
    return this.capabilities
  }

  getId(): string {
    return this.agentId
  }
}