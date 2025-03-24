/**
 * Authentication Routes
 * 
 * Defines all authentication-related API routes for the FreshFarmily system
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');
const { authenticate, requireActiveUser } = require('../middleware/auth');
const { authLogger } = require('../utils/logger');
const { User } = require('../models');

const router = express.Router();

/**
 * @route GET /api/auth/db-check
 * @description Check database connection and get user count
 * @access Public
 */
router.get('/db-check', async (req, res) => {
  try {
    // Check database connection by counting users
    const userCount = await User.count();
    
    // Return response with database status
    return res.status(200).json({
      status: 'success',
      message: 'Database connection successful',
      databaseConnected: true,
      userCount: userCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    authLogger.error(`Database check error: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      databaseConnected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/auth/register
 * @description Register a new user
 * @access Public
 */
router.post('/register', [
  // Validation middleware
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty if provided'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty if provided'),
  body('role').optional().isIn(['consumer', 'farmer', 'driver']).withMessage('Invalid role')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Register user
    const user = await authService.registerUser(req.body);
    
    // Return success response
    return res.status(201).json({
      message: 'User registered successfully. Please check your email for verification.',
      user
    });
  } catch (error) {
    authLogger.error(`Registration error: ${error.message}`);
    
    // Check for specific errors
    if (error.message === 'Email already in use') {
      return res.status(409).json({ 
        error: 'Email already in use',
        message: 'This email address is already registered. Please use a different email or try to login.'
      });
    }
    
    return res.status(500).json({ 
      error: 'Registration failed',
      message: 'An error occurred during registration. Please try again later.'
    });
  }
});

/**
 * @route POST /api/auth/verify
 * @description Verify user email with token
 * @access Public
 */
router.post('/verify', [
  body('token').trim().notEmpty().withMessage('Verification token is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verify the user
    const verified = await authService.verifyUser(req.body.token);
    
    if (verified) {
      return res.status(200).json({ message: 'Email verified successfully. You can now log in.' });
    } else {
      return res.status(400).json({ 
        error: 'Verification failed',
        message: 'Invalid or expired verification token. Please request a new verification email.'
      });
    }
  } catch (error) {
    authLogger.error(`Verification error: ${error.message}`);
    return res.status(500).json({ 
      error: 'Verification failed',
      message: 'An error occurred during email verification. Please try again later.'
    });
  }
});

/**
 * @route POST /api/auth/login
 * @description Authenticate a user and return JWT tokens
 * @access Public
 */
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Log request details for debugging (only at debug level, not console)
    authLogger.debug(`Login request: ${req.body.email}`);
    
    try {
      // Authenticate user
      const user = await authService.authenticateUser(req.body.email, req.body.password);
      
      // Generate tokens
      const tokens = await authService.generateTokens(user);
      
      // Return success response with user data and tokens
      const responseData = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          permissions: user.role === 'consumer' ? ['read', 'create_order'] :
                      user.role === 'farmer' ? ['read', 'write', 'update', 'delete_own'] :
                      user.role === 'driver' ? ['read', 'update_delivery'] :
                      user.role === 'admin' ? ['read', 'write', 'update', 'delete', 'admin'] : ['read']
        }
      };
      
      // Set content type explicitly
      res.setHeader('Content-Type', 'application/json');
      authLogger.info(`User logged in successfully: ${user.email}`);
      return res.status(200).json(responseData);
    } catch (authError) {
      throw authError; // Pass to outer catch block for consistent error handling
    }
  } catch (error) {
    authLogger.warn(`Login failed for ${req.body.email}: ${error.message}`);
    
    // Provide specific error messages for different login failures
    if (error.message.includes('Invalid email or password')) {
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Invalid email or password. Please try again.'
      });
    } else if (error.message.includes('pending verification')) {
      return res.status(403).json({ 
        error: 'Account not verified',
        message: 'Your account is pending verification. Please check your email for verification instructions.'
      });
    } else if (error.message.includes('suspended')) {
      return res.status(403).json({ 
        error: 'Account suspended',
        message: 'Your account has been suspended. Please contact support for assistance.'
      });
    }
    
    return res.status(500).json({ 
      error: 'Login failed',
      message: 'An unexpected error occurred during login. Please try again later.'
    });
  }
});

/**
 * @route POST /api/auth/refresh
 * @description Refresh access token using refresh token
 * @access Public
 */
router.post('/refresh', [
  body('refresh_token').notEmpty().withMessage('Refresh token is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Refresh the token
    const tokenResponse = await authService.refreshAccessToken(req.body.refresh_token);
    
    // Return the new access token
    return res.status(200).json(tokenResponse);
  } catch (error) {
    authLogger.warn(`Token refresh failed: ${error.message}`);
    
    if (error.message === 'Token has expired' || error.message === 'Invalid token' || error.message === 'Invalid refresh token') {
      return res.status(401).json({ 
        error: 'Invalid refresh token',
        message: 'Your session has expired. Please log in again.'
      });
    }
    
    return res.status(500).json({ 
      error: 'Token refresh failed',
      message: 'Failed to refresh access token. Please log in again.'
    });
  }
});

/**
 * @route POST /api/auth/change-password
 * @description Change user password
 * @access Private
 */
router.post('/change-password', [
  authenticate,
  requireActiveUser,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Change password
    const success = await authService.changePassword(
      req.user.userId,
      req.body.currentPassword,
      req.body.newPassword
    );
    
    // Return success response
    return res.status(200).json({ 
      message: 'Password changed successfully'
    });
  } catch (error) {
    authLogger.error(`Password change error for user ${req.user.userId}: ${error.message}`);
    
    if (error.message === 'Current password is incorrect') {
      return res.status(400).json({ 
        error: 'Invalid password',
        message: 'Current password is incorrect. Please try again.'
      });
    }
    
    return res.status(500).json({ 
      error: 'Password change failed',
      message: 'An error occurred while changing your password. Please try again later.'
    });
  }
});

/**
 * @route GET /api/auth/me
 * @description Get current user's information
 * @access Private
 */
router.get('/me', [authenticate, requireActiveUser], async (req, res) => {
  try {
    // Get user from database (including profile)
    const { User, Profile } = require('../models/user');
    const user = await User.findByPk(req.user.userId, {
      include: [{
        model: Profile,
        as: 'Profile'
      }]
    });
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'Your user account could not be found.'
      });
    }
    
    // Convert to plain object and remove sensitive data
    const userJSON = user.toJSON();
    delete userJSON.password;
    delete userJSON.verificationToken;
    delete userJSON.passwordResetToken;
    delete userJSON.passwordResetExpires;
    delete userJSON.refreshToken;
    
    // Return user data
    return res.status(200).json({ user: userJSON });
  } catch (error) {
    authLogger.error(`Error fetching user data for ${req.user.userId}: ${error.message}`);
    return res.status(500).json({ 
      error: 'Failed to fetch user data',
      message: 'An error occurred while retrieving your account information.'
    });
  }
});

/**
 * @route GET /api/auth/user
 * @description Get current user's information
 * @access Private
 */
router.get('/user', authenticate, async (req, res) => {
  try {
    // User information is already attached to req.user by the authenticate middleware
    const user = req.user;
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'Could not find user information'
      });
    }

    // Return user data without sensitive information
    return res.status(200).json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions: user.permissions || []
    });
  } catch (error) {
    authLogger.error(`Error fetching user info: ${error.message}`);
    return res.status(500).json({ 
      error: 'Failed to fetch user info',
      message: 'An error occurred while fetching user information'
    });
  }
});

/**
 * @route GET /api/auth/admin-check
 * @description Check if current user has admin permissions
 * @access Private (Admin only)
 */
router.get('/admin-check', [
  authenticate,
  requireActiveUser,
  (req, res, next) => {
    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You do not have admin privileges.'
      });
    }
    next();
  }
], (req, res) => {
  return res.status(200).json({ 
    message: 'You have admin privileges',
    userId: req.user.userId,
    role: req.user.role
  });
});

/**
 * @route POST /api/auth/logout
 * @description Log out a user (clear refresh token)
 * @access Private
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Clear refresh token in database
    const { User } = require('../models/user');
    await User.update(
      { refreshToken: null },
      { where: { id: req.user.userId } }
    );
    
    // Return success response
    return res.status(200).json({ 
      message: 'Logged out successfully'
    });
  } catch (error) {
    authLogger.error(`Logout error for user ${req.user.userId}: ${error.message}`);
    return res.status(500).json({ 
      error: 'Logout failed',
      message: 'An error occurred during logout.'
    });
  }
});

module.exports = router;
