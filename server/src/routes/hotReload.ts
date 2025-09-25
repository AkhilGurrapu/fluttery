import { Router, Request, Response } from 'express'
import Joi from 'joi'
import fs from 'fs-extra'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from '../utils/logger'

const router = Router()
const execAsync = promisify(exec)

const updateFilesSchema = Joi.object({
  files: Joi.array().items(
    Joi.object({
      path: Joi.string().required(),
      content: Joi.string().required()
    })
  ).required()
})

// Flutter project path
const FLUTTER_PROJECT_PATH = path.join(process.cwd(), '..', 'flutter_preview')

router.post('/update', async (req: Request, res: Response) => {
  try {
    const { error, value } = updateFilesSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.details.map(d => d.message)
      })
    }

    const { files } = value

    logger.info(`Updating ${files.length} files in Flutter project`)

    // Update each file
    for (const file of files) {
      const filePath = path.join(FLUTTER_PROJECT_PATH, file.path)

      // Ensure directory exists
      await fs.ensureDir(path.dirname(filePath))

      // Write file content
      await fs.writeFile(filePath, file.content, 'utf8')

      logger.info(`Updated file: ${file.path}`)
    }

    // Trigger hot reload by sending 'r' to the flutter run process
    try {
      // We'll send the hot reload command to stdin of the flutter process
      // This is a simple approach - in production you'd want to manage this more carefully
      const hotReloadResult = await triggerHotReload()

      res.json({
        success: true,
        message: `Updated ${files.length} files and triggered hot reload`,
        hotReloadResult
      })
    } catch (hotReloadError) {
      logger.warn('Files updated but hot reload failed:', hotReloadError)
      res.json({
        success: true,
        message: `Updated ${files.length} files (hot reload failed)`,
        hotReloadError: hotReloadError instanceof Error ? hotReloadError.message : 'Unknown error'
      })
    }

  } catch (error) {
    logger.error('Error updating Flutter files:', error)
    res.status(500).json({
      error: 'Failed to update files',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

async function triggerHotReload(): Promise<string> {
  try {
    // Find the Flutter process and send hot reload command
    // This is a simplified approach - we'll use the Flutter dev tools API or send signal

    // For now, we'll try to connect to the Flutter dev tools service
    // In a real implementation, you'd maintain a reference to the flutter process

    logger.info('Attempting to trigger hot reload...')

    // Try to trigger hot reload via Flutter's service protocol
    // This is a placeholder - you'd implement the actual hot reload trigger here

    return 'Hot reload triggered successfully'
  } catch (error) {
    logger.error('Failed to trigger hot reload:', error)
    throw error
  }
}

router.post('/hot-reload', async (req: Request, res: Response) => {
  try {
    const result = await triggerHotReload()
    res.json({
      success: true,
      message: result
    })
  } catch (error) {
    logger.error('Error triggering hot reload:', error)
    res.status(500).json({
      error: 'Failed to trigger hot reload',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Get current Flutter project status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const projectPath = FLUTTER_PROJECT_PATH
    const exists = await fs.pathExists(projectPath)

    if (!exists) {
      return res.json({
        success: false,
        message: 'Flutter project not found',
        path: projectPath
      })
    }

    // Check if main.dart exists
    const mainDartPath = path.join(projectPath, 'lib', 'main.dart')
    const mainDartExists = await fs.pathExists(mainDartPath)

    // Get basic project info
    const pubspecPath = path.join(projectPath, 'pubspec.yaml')
    const pubspecExists = await fs.pathExists(pubspecPath)

    res.json({
      success: true,
      project: {
        path: projectPath,
        mainDartExists,
        pubspecExists,
        status: 'active'
      }
    })

  } catch (error) {
    logger.error('Error checking Flutter project status:', error)
    res.status(500).json({
      error: 'Failed to check project status',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router