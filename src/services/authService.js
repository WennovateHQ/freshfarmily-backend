/**
 * Authentication Service
 * 
 * Handles user authentication, registration, and token management
 */

const bcrypt = require('bcrypt');
const { User, Profile } = require('../models');
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

    // All users are automatically set to active status
    const initialStatus = 'active';

    // Create the user with fields that actually exist in the database
    const user = await User.create({
      email: userData.email,
      password: userData.password,  // Will be hashed by the model's beforeCreate hook
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      role: userData.role || 'consumer',
      status: initialStatus,
      isActive: true,
      stripeCustomerId: null,
      stripeAccountId: null
    }, { transaction });

    // Create user profile if profile data is provided
    try {
      // Attempt to create a profile - this will succeed once we've created the Profiles table
      await Profile.create({
        userId: user.id,
        address: userData.address || '',
        city: userData.city || '',
        state: userData.state || '',
        zipCode: userData.zipCode || '',
        phone: userData.phone || '',
      }, { transaction });
      authLogger.info(`Created profile for user ${user.id}`);
    } catch (profileError) {
      // If the Profiles table doesn't exist yet, this will fail, but we'll still create the user
      authLogger.warn(`Error creating profile for user ${user.id}: ${profileError.message}`);
      // We'll continue with user creation regardless of profile creation success
    }

    // Commit transaction
    await transaction.commit();

    // Return sanitized user object (no password)
    const { password, ...userWithoutPassword } = user.get({ plain: true });
    return userWithoutPassword;
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    authLogger.error(`User registration error: ${error.message}`);
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
    // Check for test credentials in development environment
    if (process.env.NODE_ENV === 'development' && 
        email === 'test@example.com' && 
        password === 'password') {
      
      authLogger.info('Using test user credentials');
      
      // Create mock user for development
      const testUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'farmer',
        status: 'active',
        permissions: ['read', 'write', 'update', 'delete_own'],
        createdAt: new Date(),
        updatedAt: new Date(),
        Profile: {
          id: 'test-profile-id',
          userId: 'test-user-id',
          address: '123 Test Street',
          city: 'Testville',
          state: 'CA',
          zipCode: '12345',
          phone: '123-456-7890'
        },
        // Simple method to get user data without password
        get: function(options) {
          return {
            id: this.id,
            email: this.email,
            firstName: this.firstName,
            lastName: this.lastName,
            role: this.role,
            status: this.status,
            permissions: this.permissions,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            Profile: this.Profile
          };
        }
      };
      
      return testUser;
    }
    
    // Find user with direct SQL first
    const [userResults] = await sequelize.query(`
      SELECT * FROM users WHERE email = :email LIMIT 1
    `, {
      replacements: { email }
    });
    
    // If user not found via direct query
    if (!userResults || userResults.length === 0) {
      authLogger.warn(`User not found with email: ${email}`);
      throw new Error('Invalid credentials');
    }
    
    const user = userResults[0];
    const userId = user.id;
    
    // Check password with direct SQL to avoid model issues
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      authLogger.warn(`Invalid password for user: ${email}`);
      throw new Error('Invalid credentials');
    }
    
    // If user is not active
    if (user.status !== 'active') {
      throw new Error('Account is not active');
    }
    
    // Get profile information directly
    const [profileResults] = await sequelize.query(`
      SELECT * FROM profiles WHERE "userId" = :userId LIMIT 1
    `, {
      replacements: { userId }
    });
    
    // Construct a user object with profile
    const authenticatedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      Profile: profileResults && profileResults.length > 0 ? profileResults[0] : null,
      // Add a get method to match Sequelize model behavior
      get: function(options) {
        const plainUser = { ...this };
        delete plainUser.get;
        delete plainUser.password;
        return plainUser;
      }
    };
    
    authLogger.info(`User authenticated successfully: ${authenticatedUser.id}`);
    return authenticatedUser;
  } catch (error) {
    // If the error is already a known error, rethrow it
    if (error.message === 'Invalid credentials' || error.message === 'Account is not active') {
      throw error;
    }
    
    // Otherwise log the detailed error and throw a generic one
    authLogger.error(`Authentication error details: ${error.message}`);
    throw new Error('Invalid credentials');
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
    
    // Find the user - we no longer store refresh tokens in the database
    // so we just look up the user by ID
    const user = await User.findOne({
      where: { 
        id: decoded.userId
      }
    });
    
    if (!user) {
      authLogger.warn(`User not found for token: ${decoded.userId}`);
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
    try {
      const isPasswordValid = await user.validatePassword(currentPassword);
      if (!isPasswordValid) {
        authLogger.warn(`Password change failed: Invalid current password for user ${userId}`);
        throw new Error('Current password is incorrect');
      }
    } catch (passwordError) {
      authLogger.error(`Password validation error: ${passwordError.message}`);
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

/**
 * Get tokens for authenticated user
 * 
 * @param {Object} user - Authenticated user
 * @returns {Object} Access and refresh tokens
 */
const getTokensForUser = async (user) => {
  try {
    // Create tokens
    const tokens = createTokens(user);
    
    // We don't store refresh tokens in the database anymore
    // Just log the token generation
    authLogger.info(`Tokens generated successfully for user: ${user.id}, role: ${user.role}`);
    return tokens;
  } catch (error) {
    authLogger.error(`Token generation error: ${error.message}`);
    throw error;
  }
};

module.exports = {
  registerUser,
  authenticateUser,
  refreshAccessToken,
  changePassword,
  getTokensForUser
};
