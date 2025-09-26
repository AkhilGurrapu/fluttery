import { Router, Request, Response } from 'express'
import Joi from 'joi'
import { sessionManager } from '../services/sessionManager'
import { MultiAgentService } from '../services/multiAgentService'
import { logger } from '../utils/logger'

// Initialize multi-agent service
const multiAgentService = new MultiAgentService(sessionManager)

const router = Router()

const createSessionSchema = Joi.object({
  userId: Joi.string().optional(),
  initialPrompt: Joi.string().min(10).max(2000).optional(),
  appType: Joi.string().valid('mobile', 'web', 'desktop').default('mobile')
})

const updateCodeSchema = Joi.object({
  prompt: Joi.string().min(5).max(2000).required()
})

// Create new session
router.post('/', async (req: Request, res: Response) => {
  try {
    const { error, value } = createSessionSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.details.map(d => d.message)
      })
    }

    const { userId, initialPrompt } = value

    logger.info(`Creating new session for user: ${userId || 'anonymous'}`)

    const session = await sessionManager.createSession(userId, initialPrompt)

    res.json({
      success: true,
      session: {
        id: session.id,
        previewUrl: session.previewUrl,
        status: session.status,
        createdAt: session.createdAt
      }
    })

  } catch (error) {
    logger.error('Error creating session:', error)
    res.status(500).json({
      error: 'Failed to create session',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Get session details
router.get('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params

    const session = await sessionManager.getSession(sessionId)
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        sessionId
      })
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        previewUrl: session.previewUrl,
        status: session.status,
        createdAt: session.createdAt,
        lastActive: session.lastActive
      }
    })

  } catch (error) {
    logger.error('Error getting session:', error)
    res.status(500).json({
      error: 'Failed to get session',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Update session code with Multi-Agent AI
router.post('/:sessionId/code', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params
    const { error, value } = updateCodeSchema.validate(req.body)

    if (error) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.details.map(d => d.message)
      })
    }

    const { prompt } = value

    const session = await sessionManager.getSession(sessionId)
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        sessionId
      })
    }

    logger.info(`Processing multi-agent request for session ${sessionId}: "${prompt}"`)

    // Check if multi-agent session exists, create if not
    let multiAgentSession = multiAgentService.getSession(sessionId)
    if (!multiAgentSession) {
      multiAgentSession = await multiAgentService.createSession(sessionId, prompt)
    }

    // Process with multi-agent system
    const result = await multiAgentService.processUserPrompt(sessionId, prompt)

    if (result.success) {
      res.json({
        success: true,
        message: 'Multi-agent processing completed',
        sessionId,
        status: result.status,
        progress: result.progress,
        data: result.data,
        previewUrl: session.previewUrl,
        flutterProjectGenerated: result.flutterProjectGenerated || false,
        nextSteps: result.nextSteps || []
      })
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        sessionId,
        status: result.status
      })
    }

  } catch (error) {
    logger.error('Error processing multi-agent request:', error)
    res.status(500).json({
      error: 'Failed to process multi-agent request',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// List all active sessions (for debugging)
router.get('/', async (req: Request, res: Response) => {
  try {
    const sessions = await sessionManager.listSessions()

    res.json({
      success: true,
      sessions: sessions.map(session => ({
        id: session.id,
        userId: session.userId,
        previewUrl: session.previewUrl,
        status: session.status,
        createdAt: session.createdAt,
        lastActive: session.lastActive
      }))
    })

  } catch (error) {
    logger.error('Error listing sessions:', error)
    res.status(500).json({
      error: 'Failed to list sessions',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Get multi-agent session progress
router.get('/:sessionId/progress', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params

    const progress = multiAgentService.getSessionProgress(sessionId)
    if (!progress) {
      return res.status(404).json({
        error: 'Multi-agent session not found',
        sessionId
      })
    }

    res.json({
      success: true,
      progress
    })

  } catch (error) {
    logger.error('Error getting session progress:', error)
    res.status(500).json({
      error: 'Failed to get session progress',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Continue multi-agent execution
router.post('/:sessionId/continue', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params

    const result = await multiAgentService.continueExecution(sessionId)

    if (result.success) {
      res.json({
        success: true,
        message: 'Multi-agent execution continued',
        sessionId,
        status: result.status,
        progress: result.progress,
        data: result.data,
        flutterProjectGenerated: result.flutterProjectGenerated || false
      })
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        sessionId,
        status: result.status
      })
    }

  } catch (error) {
    logger.error('Error continuing multi-agent execution:', error)
    res.status(500).json({
      error: 'Failed to continue execution',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Get multi-agent system statistics
router.get('/stats/agents', async (req: Request, res: Response) => {
  try {
    const stats = multiAgentService.getSessionStats()
    const activeSessions = multiAgentService.getActiveSessions()

    res.json({
      success: true,
      statistics: stats,
      activeSessions: activeSessions.map(session => ({
        sessionId: session.sessionId,
        status: session.status,
        progress: session.progress,
        startTime: session.startTime,
        lastActivity: session.lastActivity
      }))
    })

  } catch (error) {
    logger.error('Error getting multi-agent statistics:', error)
    res.status(500).json({
      error: 'Failed to get statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Terminate session
router.delete('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params

    // Cleanup multi-agent session first
    await multiAgentService.cleanupSession(sessionId)

    // Then cleanup regular session
    await sessionManager.terminateSession(sessionId)

    res.json({
      success: true,
      message: 'Session terminated successfully'
    })

  } catch (error) {
    logger.error('Error terminating session:', error)
    res.status(500).json({
      error: 'Failed to terminate session',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router