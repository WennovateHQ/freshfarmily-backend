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

const router = express.Router();

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
 * @description Login with email and password
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

    // Log request details for debugging
    authLogger.debug(`Login request: ${req.body.email}, Request headers: ${JSON.stringify(req.headers)}`);
    
    // Authenticate user
    const user = await authService.authenticateUser(req.body.email, req.body.password);
    
    // Generate tokens
    const tokens = await authService.generateTokens(user);
    
    // Return success response
    authLogger.info(`User logged in successfully: ${user.email}`);
    return res.status(200).json(tokens);
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

/**
 * @route POST /api/auth/seed
 * @description Seed the database with test users (development/testing only)
 * @access Public - but only works in development or testing environments
 */
router.post('/seed', async (req, res) => {
  try {
    // Only allow in development or testing mode
    if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'This endpoint is only available in development or testing environments.'
      });
    }

    const { User, Profile } = require('../models/user');
    const bcrypt = require('bcrypt');
    
    // Check if admin user already exists
    let adminUser = await User.findOne({ where: { email: 'admin@freshfarmily.com' } });
    
    if (!adminUser) {
      // Create admin user directly using model to ensure hooks run properly
      adminUser = await User.create({
        email: 'admin@freshfarmily.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        status: 'active',
        emailVerified: true
      });
      
      // Create profile for admin
      await Profile.create({
        userId: adminUser.id,
        address: '123 Admin St',
        city: 'Admin City',
        state: 'CA',
        zipCode: '90210',
        phoneNumber: '555-123-4567'
      });
    }
    
    // Check if farmer user already exists
    let farmerUser = await User.findOne({ where: { email: 'farmer@freshfarmily.com' } });
    
    if (!farmerUser) {
      // Create farmer user
      farmerUser = await User.create({
        email: 'farmer@freshfarmily.com',
        password: 'Password123!',
        firstName: 'Farmer',
        lastName: 'User',
        role: 'farmer',
        status: 'active',
        emailVerified: true
      });
      
      // Create profile for farmer
      await Profile.create({
        userId: farmerUser.id,
        address: '456 Farm Rd',
        city: 'Farmville',
        state: 'CA',
        zipCode: '90001',
        phoneNumber: '555-987-6543'
      });
    }
    
    // Check if consumer user already exists
    let consumerUser = await User.findOne({ where: { email: 'consumer@freshfarmily.com' } });
    
    if (!consumerUser) {
      // Create consumer user
      consumerUser = await User.create({
        email: 'consumer@freshfarmily.com',
        password: 'Password123!',
        firstName: 'Consumer',
        lastName: 'User',
        role: 'consumer',
        status: 'active',
        emailVerified: true
      });
      
      // Create profile for consumer
      await Profile.create({
        userId: consumerUser.id,
        address: '789 Consumer Ave',
        city: 'Buyville',
        state: 'CA',
        zipCode: '90002',
        phoneNumber: '555-789-0123'
      });
    }
    
    return res.status(200).json({
      message: 'Test users created successfully',
      users: ['admin@freshfarmily.com', 'farmer@freshfarmily.com', 'consumer@freshfarmily.com'],
      adminId: adminUser.id,
      farmerId: farmerUser.id,
      consumerId: consumerUser.id
    });
  } catch (error) {
    authLogger.error(`Seed error: ${error.message}`);
    return res.status(500).json({ 
      error: 'Seed failed',
      message: `An error occurred while seeding test users: ${error.message}`
    });
  }
});

/**
 * @route GET /api/auth/users/test
 * @description Get test user IDs for testing purposes (development/testing only)
 * @access Public - but only works in development or testing environments
 */
router.get('/users/test', async (req, res) => {
  try {
    // Only allow in development or testing mode
    if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'This endpoint is only available in development or testing environments.'
      });
    }

    const { User } = require('../models/user');
    
    // Find all test users
    const adminUser = await User.findOne({ where: { email: 'admin@freshfarmily.com' } });
    const farmerUser = await User.findOne({ where: { email: 'farmer@freshfarmily.com' } });
    const consumerUser = await User.findOne({ where: { email: 'consumer@freshfarmily.com' } });
    
    // Return user IDs
    return res.status(200).json({
      adminId: adminUser ? adminUser.id : null,
      farmerId: farmerUser ? farmerUser.id : null,
      consumerId: consumerUser ? consumerUser.id : null
    });
  } catch (error) {
    authLogger.error(`Test users lookup error: ${error.message}`);
    return res.status(500).json({ 
      error: 'Test users lookup failed',
      message: `An error occurred while looking up test users: ${error.message}`
    });
  }
});

module.exports = router;
