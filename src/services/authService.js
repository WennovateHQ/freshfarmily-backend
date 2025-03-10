/**
 * Authentication Service
 * 
 * Handles user authentication, registration, and token management
 */

const bcrypt = require('bcrypt');
const { User, Profile } = require('../models/user');
const { createTokens, verifyToken } = require('../utils/jwt');
const { authLogger } = require('../utils/logger');
const { sequelize } = require('../config/database');

/**
 * Register a new user
 * 
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Created user object
 */
const registerUser = async (userData) => {
  const transaction = await sequelize.transaction();

  try {
    // Check if email already exists
    const existingUser = await User.findOne({ 
      where: { email: userData.email },
      transaction
    });

    if (existingUser) {
      await transaction.rollback();
      throw new Error('Email already in use');
    }

    // Set initial status based on environment
    const initialStatus = process.env.TESTING === 'true' ? 'active' : 'pending';
    const emailVerified = process.env.TESTING === 'true';

    // Create the user
    const user = await User.create({
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role || 'consumer', // Default role is consumer
      status: initialStatus,
      emailVerified: emailVerified,
      // Generate verification token
      verificationToken: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    }, { transaction });

    // Create user profile
    await Profile.create({
      userId: user.id,
      address: userData.address,
      city: userData.city,
      state: userData.state,
      zipCode: userData.zipCode,
      phone: userData.phone
    }, { transaction });

    await transaction.commit();
    
    // Log user registration
    authLogger.info(`User registered successfully: ${user.id}, Email: ${user.email}, Role: ${user.role}`);
    
    // Return user without sensitive data
    const userJSON = user.toJSON();
    delete userJSON.password;
    // In testing mode, include verification token for development convenience
    if (process.env.TESTING === 'true') {
      authLogger.info(`Testing mode: User auto-verified. Verification token: ${userJSON.verificationToken}`);
    } else {
      delete userJSON.verificationToken;
    }
    delete userJSON.refreshToken;
    
    return userJSON;
  } catch (error) {
    await transaction.rollback();
    authLogger.error(`Registration error: ${error.message}`);
    throw error;
  }
};

/**
 * Verify a user's email with verification token
 * 
 * @param {string} token - Verification token
 * @returns {Promise<boolean>} True if verification was successful
 */
const verifyUser = async (token) => {
  try {
    // Find user with matching verification token
    const user = await User.findOne({
      where: { verificationToken: token }
    });

    if (!user) {
      authLogger.warn(`Verification failed: Invalid token ${token}`);
      return false;
    }

    // Update user status
    user.status = 'active';
    user.emailVerified = true;
    user.verificationToken = null;
    await user.save();

    authLogger.info(`User verified successfully: ${user.id}, Email: ${user.email}`);
    return true;
  } catch (error) {
    authLogger.error(`Verification error: ${error.message}`);
    throw error;
  }
};

/**
 * Authenticate a user with email and password
 * 
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User object if authentication successful
 * @throws {Error} If authentication fails
 */
const authenticateUser = async (email, password) => {
  try {
    // Find user by email
    const user = await User.findOne({
      where: { email },
      include: [{
        model: Profile,
        as: 'Profile'
      }]
    });

    if (!user) {
      authLogger.warn(`Authentication failed: User not found with email ${email}`);
      throw new Error('Invalid email or password');
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      authLogger.warn(`Authentication failed: Invalid password for user ${user.id}`);
      throw new Error('Invalid email or password');
    }

    // Check if user is active
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
      
      authLogger.warn(`Login attempted on inactive account: ${user.id}, Status: ${user.status}`);
      throw new Error(message);
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    authLogger.info(`User authenticated successfully: ${user.id}, Email: ${user.email}`);
    return user;
  } catch (error) {
    authLogger.error(`Authentication error: ${error.message}`);
    throw error;
  }
};

/**
 * Generate access and refresh tokens for a user
 * 
 * @param {Object} user - User object
 * @returns {Promise<Object>} Object containing tokens and user info
 */
const generateTokens = async (user) => {
  try {
    // Create tokens
    const tokens = createTokens(user);
    
    // Store refresh token in database
    user.refreshToken = tokens.refresh_token;
    await user.save();
    
    authLogger.info(`Tokens generated successfully for user: ${user.id}`);
    return tokens;
  } catch (error) {
    authLogger.error(`Token generation error: ${error.message}`);
    throw error;
  }
};

/**
 * Refresh an access token using a refresh token
 * 
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} Object containing new access token
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    // Verify the refresh token
    const decoded = verifyToken(refreshToken);
    
    // Check if token is a refresh token
    if (!decoded.type || decoded.type !== 'refresh') {
      authLogger.warn('Invalid token type for refresh');
      throw new Error('Invalid token');
    }
    
    // Find the user
    const user = await User.findOne({
      where: { 
        id: decoded.userId,
        refreshToken
      }
    });
    
    if (!user) {
      authLogger.warn(`Refresh token not found in database for user: ${decoded.userId}`);
      throw new Error('Invalid refresh token');
    }
    
    // Generate new access token
    const accessToken = createTokens(user).access_token;
    
    authLogger.info(`Access token refreshed for user: ${user.id}`);
    return {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: 3600 // 1 hour in seconds
    };
  } catch (error) {
    authLogger.error(`Token refresh error: ${error.message}`);
    throw error;
  }
};

/**
 * Change a user's password
 * 
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<boolean>} True if password change was successful
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    // Find the user
    const user = await User.findByPk(userId);
    
    if (!user) {
      authLogger.warn(`Password change failed: User not found ${userId}`);
      throw new Error('User not found');
    }
    
    // Check current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      authLogger.warn(`Password change failed: Invalid current password for user ${userId}`);
      throw new Error('Current password is incorrect');
    }
    
    // Update password
    user.password = newPassword; // Bcrypt hash is applied in beforeUpdate hook
    await user.save();
    
    authLogger.info(`Password changed successfully for user: ${userId}`);
    return true;
  } catch (error) {
    authLogger.error(`Password change error: ${error.message}`);
    throw error;
  }
};

module.exports = {
  registerUser,
  verifyUser,
  authenticateUser,
  generateTokens,
  refreshAccessToken,
  changePassword
};
