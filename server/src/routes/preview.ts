import { Router, Request, Response } from 'express'
import Joi from 'joi'
import { flutterEngine } from '../services/flutterEngine'
import { logger } from '../utils/logger'

const router = Router()

const previewSchema = Joi.object({
  code: Joi.string().required(),
  options: Joi.object({
    width: Joi.number().min(200).max(1200).optional(),
    height: Joi.number().min(300).max(800).optional(),
    device: Joi.string().valid('ios', 'android', 'web').optional()
  }).optional()
})

const projectSchema = Joi.object({
  name: Joi.string().min(1).max(50).required(),
  code: Joi.string().required(),
  dependencies: Joi.array().items(Joi.string()).optional(),
  firebase: Joi.boolean().optional()
})

const updateProjectSchema = Joi.object({
  projectId: Joi.string().required(),
  code: Joi.string().required(),
  dependencies: Joi.array().items(Joi.string()).optional()
})

// Generate preview
router.post('/', async (req: Request, res: Response) => {
  try {
    const { error, value } = previewSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.details.map(d => d.message)
      })
    }

    const { code, options = {} } = value

    logger.info('Preview generation request received')

    // Basic code validation
    if (!code.includes('main()') && !code.includes('runApp')) {
      return res.status(400).json({
        error: 'Invalid Flutter code',
        message: 'Code must contain a main() function and runApp() call'
      })
    }

    const previewUrl = await flutterEngine.generatePreview(code, options)

    res.json({
      success: true,
      previewUrl,
      message: 'Preview generated successfully'
    })

  } catch (error) {
    logger.error('Error generating preview:', error)

    res.status(500).json({
      error: 'Failed to generate preview',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Create project
router.post('/project', async (req: Request, res: Response) => {
  try {
    const { error, value } = projectSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.details.map(d => d.message)
      })
    }

    const { name, code, dependencies = [], firebase = false } = value

    logger.info(`Creating project: ${name}`)

    const project = await flutterEngine.createProject(name, code, dependencies, firebase)

    res.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        dependencies: project.dependencies,
        firebase: project.firebase
      },
      message: 'Project created successfully'
    })

  } catch (error) {
    logger.error('Error creating project:', error)

    res.status(500).json({
      error: 'Failed to create project',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Update project
router.put('/project', async (req: Request, res: Response) => {
  try {
    const { error, value } = updateProjectSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.details.map(d => d.message)
      })
    }

    const { projectId, code, dependencies = [] } = value

    logger.info(`Updating project: ${projectId}`)

    await flutterEngine.updateProject(projectId, code, dependencies)

    res.json({
      success: true,
      message: 'Project updated successfully'
    })

  } catch (error) {
    logger.error('Error updating project:', error)

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Project not found',
        message: error.message
      })
    }

    res.status(500).json({
      error: 'Failed to update project',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Delete project
router.delete('/project/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params

    if (!projectId) {
      return res.status(400).json({
        error: 'Project ID is required'
      })
    }

    logger.info(`Deleting project: ${projectId}`)

    await flutterEngine.cleanupProject(projectId)

    res.json({
      success: true,
      message: 'Project deleted successfully'
    })

  } catch (error) {
    logger.error('Error deleting project:', error)

    res.status(500).json({
      error: 'Failed to delete project',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Validate Flutter code
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { code } = req.body

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        error: 'Code is required'
      })
    }

    const validation = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[]
    }

    // Basic validation checks
    if (!code.includes('main()')) {
      validation.valid = false
      validation.errors.push('Missing main() function')
    }

    if (!code.includes('runApp')) {
      validation.valid = false
      validation.errors.push('Missing runApp() call in main()')
    }

    if (!code.includes('MaterialApp') && !code.includes('CupertinoApp')) {
      validation.warnings.push('Consider using MaterialApp or CupertinoApp as root widget')
    }

    // Check for common syntax issues
    const openBraces = (code.match(/{/g) || []).length
    const closeBraces = (code.match(/}/g) || []).length

    if (openBraces !== closeBraces) {
      validation.valid = false
      validation.errors.push('Mismatched braces')
    }

    // Check for imports
    if (!code.includes("import 'package:flutter/material.dart'")) {
      validation.warnings.push('Missing material.dart import')
    }

    res.json({
      success: true,
      validation
    })

  } catch (error) {
    logger.error('Error validating code:', error)

    res.status(500).json({
      error: 'Failed to validate code',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Get preview status
router.get('/status/:previewId', (req: Request, res: Response) => {
  const { previewId } = req.params

  // Simple check if preview exists
  const fs = require('fs-extra')
  const path = require('path')
  const previewPath = path.join(process.cwd(), 'preview', previewId)

  if (fs.pathExistsSync(previewPath)) {
    res.json({
      success: true,
      status: 'ready',
      previewUrl: `/preview/${previewId}/index.html`
    })
  } else {
    res.json({
      success: true,
      status: 'not_found'
    })
  }
})

// Live reload endpoint for development
router.post('/reload/:previewId', async (req: Request, res: Response) => {
  try {
    const { previewId } = req.params
    const { code } = req.body

    if (!code) {
      return res.status(400).json({
        error: 'Code is required'
      })
    }

    logger.info(`Hot reload for preview: ${previewId}`)

    // Generate new preview
    const previewUrl = await flutterEngine.generatePreview(code)

    res.json({
      success: true,
      previewUrl,
      message: 'Hot reload completed'
    })

  } catch (error) {
    logger.error('Error during hot reload:', error)

    res.status(500).json({
      error: 'Hot reload failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router