import { Router, Request, Response } from 'express'
import Joi from 'joi'
import { sessionManager } from '../services/sessionManager'
import { logger } from '../utils/logger'

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

// Update session code with AI
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

    if (session.status !== 'ready') {
      return res.status(400).json({
        error: 'Session not ready',
        status: session.status
      })
    }

    logger.info(`Updating code for session ${sessionId}: "${prompt}"`)

    const result = await sessionManager.updateSessionCode(sessionId, prompt)

    res.json({
      success: true,
      message: 'Code updated successfully',
      files: result.files,
      previewUrl: session.previewUrl
    })

  } catch (error) {
    logger.error('Error updating session code:', error)
    res.status(500).json({
      error: 'Failed to update code',
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

// Terminate session
router.delete('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params

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