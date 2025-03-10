/**
 * Authentication Middleware
 * 
 * Middleware for verifying JWT tokens and checking user permissions
 */

const jwt = require('jsonwebtoken');
const { verifyToken, hasPermissions, getUserById } = require('../utils/jwt');
const { User, Profile } = require('../models/user');
const { authLogger } = require('../utils/logger');
require('dotenv').config();

/**
 * Middleware to authenticate a user's JWT token
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = async (req, res, next) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Authentication token is missing' 
      });
    }
    
    // Extract the token from the header
    const token = authHeader.split(' ')[1];
    
    try {
      // Verify the token
      const decoded = verifyToken(token);
      authLogger.debug(`Token decoded for user: ${decoded.userId}`);
      
      // Check if we're in testing mode
      const isTestingMode = process.env.NODE_ENV === 'test' || process.env.TESTING === 'true';
      
      // Enhanced test mode logging for debugging
      if (isTestingMode) {
        authLogger.debug(`[TEST] Authenticating request to ${req.originalUrl}`);
        authLogger.debug(`[TEST] User token: ${token.substring(0, 15)}...`);
        authLogger.debug(`[TEST] Headers: ${JSON.stringify(req.headers)}`);
      }
      
      // Set user info in request
      req.user = {
        userId: decoded.userId,
        role: decoded.role
      };
      
      // Log user context in test mode for debugging
      if (isTestingMode) {
        authLogger.debug(`[TEST] Authentication successful for user: ${JSON.stringify(req.user)}`);
        // authLogger.debug(`[TEST] User permissions: ${JSON.stringify(jwtUtils.getPermissionsForRole(req.user.role))}`);
      }
      
      next();
    } catch (tokenError) {
      authLogger.warn(`Token verification failed: ${tokenError.message}`);
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: tokenError.message || 'Invalid authentication token' 
      });
    }
  } catch (error) {
    authLogger.error(`Authentication error: ${error.message}`);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Authentication process failed' 
    });
  }
};

/**
 * Middleware to check if a user has the required permissions
 * 
 * @param {string[]} requiredPermissions - Array of required permissions
 * @returns {Function} Express middleware function
 */
const requirePermissions = (requiredPermissions = []) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'User is not authenticated' 
        });
      }
      
      // Check if user has the required permissions
      const { role } = req.user;
      
      if (hasPermissions(role, requiredPermissions)) {
        next();
      } else {
        authLogger.warn(`Permission denied for user ${req.user.userId} with role ${role}. Required: ${requiredPermissions.join(', ')}`);
        return res.status(403).json({ 
          error: 'Forbidden', 
          message: 'You do not have permission to access this resource' 
        });
      }
    } catch (error) {
      authLogger.error(`Permission check error: ${error.message}`);
      return res.status(500).json({ 
        error: 'Internal Server Error', 
        message: 'Failed to check permissions' 
      });
    }
  };
};

/**
 * Middleware to check if a user has a specific role
 * 
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
const requireRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'User is not authenticated' 
        });
      }
      
      // Check if user has an allowed role
      const { role } = req.user;
      
      if (allowedRoles.includes(role)) {
        next();
      } else {
        authLogger.warn(`Role check failed for user ${req.user.userId}. Has: ${role}, Required one of: ${allowedRoles.join(', ')}`);
        return res.status(403).json({ 
          error: 'Forbidden', 
          message: 'You do not have the required role to access this resource' 
        });
      }
    } catch (error) {
      authLogger.error(`Role check error: ${error.message}`);
      return res.status(500).json({ 
        error: 'Internal Server Error', 
        message: 'Failed to check user role' 
      });
    }
  };
};

/**
 * Middleware to check if a user is active
 */
const requireActiveUser = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'User is not authenticated' 
      });
    }
    
    // Get user from database
    const user = await getUserById(req.user.userId, { User, Profile });
    
    if (!user) {
      return res.status(404).json({ 
        error: 'Not Found', 
        message: 'User not found' 
      });
    }
    
    // Check user status
    if (user.status !== 'active') {
      let message;
      switch (user.status) {
        case 'pending':
          message = 'Your account is pending verification. Please check your email.';
          break;
        case 'suspended':
          message = 'Your account has been suspended. Please contact support.';
          break;
        case 'deleted':
          message = 'Your account has been deleted.';
          break;
        default:
          message = 'Your account is not active.';
      }
      
      authLogger.warn(`Inactive user attempted access: ${user.id}, Status: ${user.status}`);
      return res.status(403).json({ 
        error: 'Forbidden', 
        message 
      });
    }
    
    // User is active, proceed
    next();
  } catch (error) {
    authLogger.error(`Active user check error: ${error.message}`);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Failed to verify user status' 
    });
  }
};

// Commonly used permission middlewares
const requireAdmin = [authenticate, requireRoles(['admin'])];
const requireFarmer = [authenticate, requireRoles(['farmer', 'admin'])];
const requireDriver = [authenticate, requireRoles(['driver', 'admin'])];
const requireConsumer = [authenticate, requireRoles(['consumer', 'admin', 'farmer', 'driver'])];

// Export the middleware functions
module.exports = {
  authenticate,
  requirePermissions,
  requireRoles,
  requireActiveUser,
  requireAdmin,
  requireFarmer,
  requireDriver,
  requireConsumer
};
