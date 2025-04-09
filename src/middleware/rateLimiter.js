/**
 * Rate Limiter Middleware
 * 
 * Implements request rate limiting to prevent API abuse and improve system stability
 */

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Create a store with a sliding window
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
    retryAfter: '60 seconds'
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  },
  keyGenerator: (req) => {
    // Use auth token instead of IP for authenticated requests to prevent shared IP issues
    if (req.user && req.user.userId) {
      return req.user.userId;
    }
    return req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for certain paths
    const skippedPaths = ['/api/health', '/api/status'];
    return skippedPaths.includes(req.path);
  }
});

// More generous limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  }
});

module.exports = {
  limiter,
  authLimiter
};
