import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'
import path from 'path'

import { errorHandler } from './middleware/errorHandler'
import { rateLimiter } from './middleware/rateLimiter'
import { logger } from './utils/logger'

import apiRoutes from './routes/api'
import generateRoutes from './routes/generate'
import previewRoutes from './routes/preview'
import exportRoutes from './routes/export'
import hotReloadRoutes from './routes/hotReload'
import sessionsRoutes from './routes/sessions'

dotenv.config()

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

const PORT = process.env.PORT || 8000

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false
}))

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Rate limiting
app.use(rateLimiter)

// Static files for preview
app.use('/preview', express.static(path.join(__dirname, '../preview')))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api', apiRoutes)
app.use('/api/generate', generateRoutes)
app.use('/api/preview', previewRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/hot-reload', hotReloadRoutes)
app.use('/api/sessions', sessionsRoutes)

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`)

  socket.on('join-project', (projectId: string) => {
    socket.join(projectId)
    logger.info(`Client ${socket.id} joined project: ${projectId}`)
  })

  socket.on('code-change', (data) => {
    socket.to(data.projectId).emit('code-updated', data)
  })

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`)
  })
})

// Error handling
app.use(errorHandler)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  })
})

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 Fluttery server running on port ${PORT}`)
  logger.info(`🔗 Client URL: ${process.env.CLIENT_URL || "http://localhost:3000"}`)
  logger.info(`📱 Flutter Engine: Ready`)
  logger.info(`🤖 AI Service: ${process.env.GEMINI_API_KEY ? 'Gemini 2.0 Flash Connected' : 'Not configured'}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

export { io }