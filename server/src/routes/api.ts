import { Router } from 'express'

const router = Router()

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  })
})

// API info
router.get('/info', (req, res) => {
  res.json({
    name: 'Fluttery API',
    version: '1.0.0',
    description: 'AI-powered Flutter app builder API',
    endpoints: {
      generate: '/api/generate',
      preview: '/api/preview',
      export: '/api/export'
    },
    features: [
      'AI code generation',
      'Live preview',
      'Project export',
      'Firebase integration',
      'Multi-platform support'
    ]
  })
})

// Server stats
router.get('/stats', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    platform: process.platform,
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  })
})

export default router