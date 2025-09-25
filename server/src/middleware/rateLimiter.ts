import { Request, Response, NextFunction } from 'express'
import { RateLimiterMemory } from 'rate-limiter-flexible'

// Different rate limits for different endpoints
const rateLimiters = {
  generate: new RateLimiterMemory({
    points: 10, // 10 requests
    duration: 60, // per 1 minute
  }),

  preview: new RateLimiterMemory({
    points: 20, // 20 requests
    duration: 60, // per 1 minute
  }),

  export: new RateLimiterMemory({
    points: 5, // 5 requests
    duration: 300, // per 5 minutes
  }),

  default: new RateLimiterMemory({
    points: 100, // 100 requests
    duration: 60, // per 1 minute
  }),
}

export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Determine which rate limiter to use based on the route
    let limiter = rateLimiters.default

    if (req.path.includes('/generate')) {
      limiter = rateLimiters.generate
    } else if (req.path.includes('/preview')) {
      limiter = rateLimiters.preview
    } else if (req.path.includes('/export')) {
      limiter = rateLimiters.export
    }

    await limiter.consume(req.ip || 'unknown')
    next()
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1

    res.set('Retry-After', String(secs))
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: secs
    })
  }
}