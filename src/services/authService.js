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
    // Always set users to active to simplify testing and development
    const initialStatus = 'active';
    const emailVerified = true;

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
    // Log authentication attempt
    authLogger.info(`Authentication attempt for email: ${email}`);
    console.log(`Authentication attempt for email: ${email}`);
    
    // Check for debug/test mode - this allows easier testing with a known account
    if (process.env.TESTING === 'true' && email === 'test@example.com' && password === 'password123') {
      authLogger.info('Test mode: Using test account for authentication');
      console.log('Test mode: Using test account for authentication');
      
      // Create a test user object
      const testUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'consumer',
        status: 'active',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date(),
        profile: {
          id: 'test-profile-id',
          userId: 'test-user-id',
          address: '123 Test Street',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          phone: '555-123-4567'
        },
        toJSON: function() {
          return {
            id: this.id,
            email: this.email,
            firstName: this.firstName,
            lastName: this.lastName,
            role: this.role,
            status: this.status,
            emailVerified: this.emailVerified,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            lastLogin: this.lastLogin,
            Profile: this.profile
          };
        }
      };
      
      authLogger.info(`Test user authenticated successfully: ${testUser.id}, Email: ${testUser.email}`);
      console.log(`Test user authenticated successfully: ${testUser.id}, Email: ${testUser.email}`);
      return testUser;
    }
    
    // Standard authentication flow
    // Find user by email
    try {
      authLogger.debug(`Attempting to find user with email: ${email}`);
      
      const user = await User.findOne({
        where: { email },
        include: [{
          model: Profile,
          as: 'Profile',
          required: false // Make this a LEFT JOIN so it returns the user even if no profile exists
        }]
      });

      if (!user) {
        authLogger.warn(`Authentication failed: User not found with email ${email}`);
        console.log(`Authentication failed: User not found with email ${email}`);
        throw new Error('Invalid email or password');
      }

      // Log successful user lookup
      authLogger.info(`User found with email ${email}, id: ${user.id}, role: ${user.role || 'unknown'}, status: ${user.status || 'unknown'}`);
      console.log(`User found with email ${email}, id: ${user.id}, role: ${user.role || 'unknown'}, status: ${user.status || 'unknown'}`);
      
      // Compare passwords
      try {
        if (!user.password) {
          authLogger.error(`User ${user.id} has no password stored`);
          throw new Error('Account requires password reset');
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
          authLogger.warn(`Authentication failed: Invalid password for user ${user.id}`);
          console.log(`Authentication failed: Invalid password for user ${user.id}`);
          throw new Error('Invalid email or password');
        }
      } catch (pwError) {
        authLogger.error(`Password verification error: ${pwError.message}`);
        console.error(`Password verification error: ${pwError.message}`);
        
        if (pwError.message === 'Invalid email or password') {
          throw pwError; // Pass through our custom error
        } else {
          // Handle password comparison errors
          throw new Error('Authentication failed due to a server error. Please try again.');
        }
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
        console.log(`Login attempted on inactive account: ${user.id}, Status: ${user.status}`);
        throw new Error(message);
      }

      // Update last login timestamp
      user.lastLogin = new Date();
      await user.save();

      authLogger.info(`User authenticated successfully: ${user.id}, Email: ${user.email}`);
      console.log(`User authenticated successfully: ${user.id}, Email: ${user.email}, Role: ${user.role}`);
      return user;
    } catch (dbError) {
      authLogger.error(`Database error during authentication: ${dbError.message}`);
      console.error(`Database error during authentication: ${dbError.message}`);
      
      // Provide a more generic error to the client
      if (dbError.message === 'Invalid email or password') {
        throw dbError; // Pass through our custom error
      } else {
        // For technical DB errors, provide generic message but log the actual error
        throw new Error('Authentication service is temporarily unavailable. Please try again later.');
      }
    }
  } catch (error) {
    authLogger.error(`Authentication error: ${error.message}`);
    console.error(`Authentication error: ${error.message}`);
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
    
    // Store refresh token in database if this is a database model
    // (test users don't have save method)
    if (user.save && typeof user.save === 'function') {
      user.refreshToken = tokens.refresh_token;
      await user.save();
    } else {
      // For test users, just log that we can't save
      authLogger.info(`Test user detected - skipping database update for user: ${user.id}`);
      console.log(`Test user detected - skipping database update for user: ${user.id}`);
    }
    
    authLogger.info(`Tokens generated successfully for user: ${user.id}, role: ${user.role}`);
    console.log(`Tokens generated successfully for user: ${user.id}, role: ${user.role}`);
    return tokens;
  } catch (error) {
    authLogger.error(`Token generation error: ${error.message}`);
    console.error(`Token generation error: ${error.message}`);
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
