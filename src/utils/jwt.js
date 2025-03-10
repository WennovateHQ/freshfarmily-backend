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
const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_SECRET_KEY_HERE';
const JWT_ACCESS_EXPIRATION = process.env.JWT_ACCESS_EXPIRATION || '30m';
const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || '7d';
const TESTING = process.env.TESTING === 'true' || process.env.NODE_ENV === 'test';

// Role-based permission mapping
const ROLE_PERMISSIONS = {
  admin: ['read', 'write', 'update', 'delete', 'admin', 'read_admin', 'read_farm'],
  farmer: ['read', 'write', 'update', 'delete_own', 'read_farm'],
  driver: ['read', 'update_delivery'],
  consumer: ['read', 'create_order']
};

// Database of test user emails for quick lookup when TESTING=true
const TEST_USER_EMAILS = {
  'admin@freshfarmily.com': 'admin',
  'farmer@freshfarmily.com': 'farmer',
  'driver@freshfarmily.com': 'driver',
  'consumer@freshfarmily.com': 'consumer'
};

// Test users for development (when TESTING=true)
const TEST_USERS = {
  admin_test_id: {
    id: 'admin_test_id',
    email: 'admin@test.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    status: 'active',
    emailVerified: true,
    profile: {
      id: 'profile_admin_id',
      phone: '555-123-4567',
      address: '123 Admin St',
      city: 'Admin City',
      state: 'CA',
      zipCode: '12345'
    }
  },
  farmer_test_id: {
    id: 'farmer_test_id',
    email: 'farmer@test.com',
    firstName: 'Farmer',
    lastName: 'User',
    role: 'farmer',
    status: 'active',
    emailVerified: true,
    profile: {
      id: 'profile_farmer_id',
      phone: '555-234-5678',
      address: '456 Farm Rd',
      city: 'Farmville',
      state: 'CA',
      zipCode: '23456'
    }
  },
  driver_test_id: {
    id: 'driver_test_id',
    email: 'driver@test.com',
    firstName: 'Driver',
    lastName: 'User',
    role: 'driver',
    status: 'active',
    emailVerified: true,
    profile: {
      id: 'profile_driver_id',
      phone: '555-345-6789',
      address: '789 Delivery Ln',
      city: 'Driverton',
      state: 'CA',
      zipCode: '34567'
    }
  },
  consumer_test_id: {
    id: 'consumer_test_id',
    email: 'consumer@test.com',
    firstName: 'Consumer',
    lastName: 'User',
    role: 'consumer',
    status: 'active',
    emailVerified: true,
    profile: {
      id: 'profile_consumer_id',
      phone: '555-456-7890',
      address: '101 Consumer Ave',
      city: 'Buyville',
      state: 'CA',
      zipCode: '45678'
    }
  }
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
      userId: userData.id,
      role: userData.role
    };

    authLogger.debug(`Creating access token for user: ${userData.id} with role: ${userData.role}`);
    
    // Set expiration time - use longer expiration for testing
    const expiresIn = TESTING ? '1h' : JWT_ACCESS_EXPIRATION;
    
    return jwt.sign(tokenData, JWT_SECRET, { expiresIn });
  } catch (error) {
    authLogger.error(`Error creating access token: ${error.message}`);
    throw new Error('Failed to create access token');
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
      role: userData.role,
      type: 'refresh'
    };
    
    authLogger.debug(`Creating refresh token for user: ${userData.id}`);
    
    // Set expiration time - use longer expiration for testing
    const expiresIn = TESTING ? '7d' : JWT_REFRESH_EXPIRATION;
    
    return jwt.sign(tokenData, JWT_SECRET, { expiresIn });
  } catch (error) {
    authLogger.error(`Error creating refresh token: ${error.message}`);
    throw new Error('Failed to create refresh token');
  }
};

/**
 * Create both access and refresh tokens for a user
 * 
 * @param {Object} user - User object
 * @returns {Object} Object containing both tokens and user info
 */
const createTokens = (user) => {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);
  
  // Calculate token expiration in seconds for client
  const decoded = jwt.decode(accessToken);
  const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
  
  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: expiresIn,
    refresh_token: refreshToken,
    user_id: user.id,
    user_role: user.role,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified
    }
  };
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
    // In testing mode with appropriate test token, bypass JWT verification
    if (TESTING && token === 'test_admin_token') {
      authLogger.debug('Using TEST admin token - bypassing JWT verification');
      return {
        userId: 'admin_test_id',
        email: 'admin@test.com',
        role: 'admin'
      };
    } else if (TESTING && token === 'test_farmer_token') {
      authLogger.debug('Using TEST farmer token - bypassing JWT verification');
      return {
        userId: 'farmer_test_id',
        email: 'farmer@test.com',
        role: 'farmer'
      };
    } else if (TESTING && token === 'test_consumer_token') {
      authLogger.debug('Using TEST consumer token - bypassing JWT verification');
      return {
        userId: 'consumer_test_id',
        email: 'consumer@test.com',
        role: 'consumer'
      };
    }
    
    // Standard JWT verification
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Log decoded token in testing mode
    if (TESTING) {
      authLogger.debug(`Decoded JWT token in test mode: ${JSON.stringify(decoded)}`);
      
      // Add permissions information to the token when in test mode
      // This helps with debugging permission issues
      if (decoded.role) {
        decoded.permissions = getPermissionsForRole(decoded.role);
        authLogger.debug(`Added permissions to decoded token: ${JSON.stringify(decoded.permissions)}`);
      }
    }
    
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
 * Get user by ID (supports test mode)
 * 
 * @param {string} userId - User ID
 * @param {Object} models - Sequelize models (User, Profile)
 * @returns {Promise<Object>} User object with profile
 */
const getUserById = async (userId, models) => {
  try {
    // In normal mode or when models are provided, fetch user from database
    if (!TESTING || models) {
      authLogger.debug(`Fetching user from database: ${userId}`);
      const user = await models.User.findByPk(userId, {
        include: [{
          model: models.Profile,
          as: 'Profile'
        }]
      });
      
      if (!user) {
        // If testing and we couldn't find a real user, create a mock user with correct permissions
        if (TESTING) {
          authLogger.info(`TESTING MODE: Creating mock user for ID: ${userId}`);
          // Extract decoded token to get role information
          try {
            // Try to find a test user in the database
            const testAdmin = await models.User.findOne({ where: { email: 'admin@freshfarmily.com' } });
            const testFarmer = await models.User.findOne({ where: { email: 'farmer@freshfarmily.com' } });
            const testConsumer = await models.User.findOne({ where: { email: 'consumer@freshfarmily.com' } });
            
            let role = 'consumer';
            let email = 'test@example.com';
            let firstName = 'Test';
            let lastName = 'User';
            
            // If the userId matches one of our test users, use that role
            if (testAdmin && testAdmin.id === userId) {
              role = 'admin';
              email = 'admin@freshfarmily.com';
              firstName = 'Admin';
              lastName = 'User';
            } else if (testFarmer && testFarmer.id === userId) {
              role = 'farmer';
              email = 'farmer@freshfarmily.com';
              firstName = 'Farmer';
              lastName = 'User';
            } else if (testConsumer && testConsumer.id === userId) {
              role = 'consumer';
              email = 'consumer@freshfarmily.com';
              firstName = 'Consumer';
              lastName = 'User';
            }
            
            return {
              id: userId,
              email,
              firstName,
              lastName,
              role,
              status: 'active',
              emailVerified: true,
              Profile: {
                id: `profile_${userId}`,
                userId,
                address: '123 Test St',
                city: 'Test City',
                state: 'TS',
                zipCode: '12345',
                phone: '555-123-4567'
              }
            };
          } catch (mockError) {
            authLogger.warn(`Failed to create mock user: ${mockError.message}`);
          }
        }
        
        authLogger.warn(`User not found: ${userId}`);
        return null;
      }
      
      return user;
    }
    
    // Fallback for old-style testing without database access
    authLogger.info(`TESTING MODE (fallback): Using mock user data for ID: ${userId}`);
    
    // Default to consumer permissions if no specific role is matched
    const role = userId.includes('admin') ? 'admin' : 
                userId.includes('farmer') ? 'farmer' : 
                userId.includes('driver') ? 'driver' : 'consumer';
                
    return {
      id: userId,
      email: `${role}@test.com`,
      firstName: role.charAt(0).toUpperCase() + role.slice(1),
      lastName: 'User',
      role,
      status: 'active',
      emailVerified: true,
      Profile: {
        id: `profile_${userId}`,
        userId,
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        phone: '555-123-4567'
      }
    };
  } catch (error) {
    authLogger.error(`Error fetching user ${userId}: ${error.message}`);
    throw new Error(`Failed to fetch user: ${error.message}`);
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
