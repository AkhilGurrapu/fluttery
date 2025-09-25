import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { statusCode = 500, message, stack } = error

  logger.error('Error occurred:', {
    statusCode,
    message,
    stack,
    url: req.url,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params
  })

  // Don't expose internal errors in production
  const isProduction = process.env.NODE_ENV === 'production'

  const response: any = {
    error: true,
    statusCode,
    message: isProduction && statusCode === 500 ? 'Internal Server Error' : message,
    timestamp: new Date().toISOString(),
    path: req.url
  }

  if (!isProduction) {
    response.stack = stack
  }

  res.status(statusCode).json(response)
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error: AppError = new Error(message)
  error.statusCode = statusCode
  error.isOperational = true
  return error
}