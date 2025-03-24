/**
 * JWT Authentication Utility
 * 
 * Provides utilities for generating, validating, and decoding JWT tokens
 * with role-based permission validation for the FreshFarmily system.
 */

const jwt = require('jsonwebtoken');
const logger = require('./logger');
const { authLogger } = require('./logger');
require('dotenv').config();

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_ACCESS_EXPIRATION = process.env.JWT_ACCESS_EXPIRATION || '30m';
const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || '7d';

// Role-based permission mapping
const ROLE_PERMISSIONS = {
  admin: ['read', 'write', 'update', 'delete', 'admin', 'read_admin', 'read_farm'],
  farmer: ['read', 'write', 'update', 'delete_own', 'read_farm'],
  driver: ['read', 'update_delivery'],
  consumer: ['read', 'create_order']
};

/**
 * Create an access token for a user
 * 
 * @param {Object} userData - User data to encode in the token
 * @returns {string} JWT token
 */
const createAccessToken = (userData) => {
  try {
    const tokenData = {
      sub: userData.id, // Use standard 'sub' claim for subject (user ID)
      userId: userData.id, // Keep userId for backward compatibility
      email: userData.email,
      role: userData.role,
      permissions: getPermissionsForRole(userData.role),
      // Add additional claims as needed
      iat: Math.floor(Date.now() / 1000) // Issued at timestamp
    };

    authLogger.debug(`Creating access token for user: ${userData.id} with role: ${userData.role}`);
    
    // Set expiration time
    const expiresIn = JWT_ACCESS_EXPIRATION;
    
    // Make sure JWT_SECRET is not empty
    if (!JWT_SECRET || JWT_SECRET === '') {
      authLogger.error('JWT_SECRET is not properly set!');
      throw new Error('JWT secret key is not configured. Please set JWT_SECRET environment variable.');
    }

    return jwt.sign(tokenData, JWT_SECRET, { expiresIn });
  } catch (error) {
    authLogger.error(`Error creating access token: ${error.message}`);
    throw error;
  }
};

/**
 * Create a refresh token for a user
 * 
 * @param {Object} userData - User data to encode in the token
 * @returns {string} JWT token
 */
const createRefreshToken = (userData) => {
  try {
    const tokenData = {
      userId: userData.id,
      email: userData.email,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000) // Issued at timestamp
    };

    authLogger.debug(`Creating refresh token for user: ${userData.id}`);
    
    // Set expiration time
    const expiresIn = JWT_REFRESH_EXPIRATION;
    
    // Make sure JWT_SECRET is not empty
    if (!JWT_SECRET || JWT_SECRET === '') {
      authLogger.error('JWT_SECRET is not properly set!');
      throw new Error('JWT secret key is not configured. Please set JWT_SECRET environment variable.');
    }
    
    return jwt.sign(tokenData, JWT_SECRET, { expiresIn });
  } catch (error) {
    authLogger.error(`Error creating refresh token: ${error.message}`);
    throw error;
  }
};

/**
 * Create both access and refresh tokens for a user
 * 
 * @param {Object} user - User object
 * @returns {Object} Object containing both tokens and user info
 */
const createTokens = (user) => {
  try {
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);
    
    // Calculate token expiration in seconds for client
    const decoded = jwt.decode(accessToken);
    const expiresIn = decoded ? (decoded.exp - Math.floor(Date.now() / 1000)) : 3600; // Default to 1 hour if decode fails
    
    // Format user data for response
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role || 'consumer',
      status: user.status || 'active',
      emailVerified: user.emailVerified || false
    };
    
    // Format profile data if available
    let profileData = null;
    try {
      if (user.Profile) {
        profileData = {
          id: user.Profile.id || null,
          address: user.Profile.address || '',
          city: user.Profile.city || '',
          state: user.Profile.state || '',
          zipCode: user.Profile.zipCode || '',
          phone: user.Profile.phone || ''
        };
      }
    } catch (profileError) {
      // Just log the error but continue - profile is optional
      authLogger.warn(`Error processing user profile: ${profileError.message}`);
      profileData = null;
    }
    
    // Log successful token creation
    authLogger.info(`Tokens generated successfully for user: ${user.id}, role: ${userData.role}`);
    
    return {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken,
      user: {
        ...userData,
        Profile: profileData
      }
    };
  } catch (error) {
    authLogger.error(`Error creating tokens: ${error.message}`);
    throw error;
  }
};

/**
 * Verify a JWT token
 * 
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token data
 * @throws {Error} If token is invalid or expired
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    authLogger.error(`JWT verification error: ${error.message}`);
    throw new Error('Invalid or expired token');
  }
};

/**
 * Get permissions for a specific role
 * 
 * @param {string} role - User role
 * @returns {Array} List of permissions for the role
 */
const getPermissionsForRole = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

/**
 * Check if a user has specific permissions
 * 
 * @param {string} role - User role
 * @param {Array} requiredPermissions - List of required permissions
 * @returns {boolean} True if user has all required permissions
 */
const hasPermissions = (role, requiredPermissions) => {
  // If no required permissions, access is granted
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }
  
  // If invalid role, deny access
  if (!role || !ROLE_PERMISSIONS[role]) {
    authLogger.warn(`Invalid role: ${role}`);
    return false;
  }
  
  const userPermissions = getPermissionsForRole(role);
  
  // Log permission check details in debug mode
  authLogger.debug(`Checking permissions for role ${role}`);
  authLogger.debug(`User permissions: ${userPermissions.join(', ')}`);
  authLogger.debug(`Required permissions: ${requiredPermissions.join(', ')}`);
  
  // Check if the user has all the required permissions
  const hasAllPermissions = requiredPermissions.every(permission => userPermissions.includes(permission));
  
  // Log the result
  if (hasAllPermissions) {
    authLogger.debug(`Permission check passed for role ${role}`);
  } else {
    authLogger.debug(`Permission check failed for role ${role}`);
  }
  
  return hasAllPermissions;
};

/**
 * Get user by ID
 * 
 * @param {string} userId - User ID
 * @param {Object} models - Sequelize models (User, Profile)
 * @returns {Promise<Object>} User object with profile
 */
const getUserById = async (userId, models) => {
  try {
    authLogger.debug(`Fetching user from database: ${userId}`);
    const user = await models.User.findByPk(userId, {
      include: [{
        model: models.Profile,
        as: 'Profile'
      }]
    });
    
    if (!user) {
      authLogger.warn(`User not found: ${userId}`);
      return null;
    }
    
    return user;
  } catch (error) {
    authLogger.error(`Error fetching user ${userId}: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createAccessToken,
  createRefreshToken,
  createTokens,
  verifyToken,
  getPermissionsForRole,
  hasPermissions,
  getUserById,
  ROLE_PERMISSIONS
};
