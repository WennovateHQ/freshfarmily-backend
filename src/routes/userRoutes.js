/**
 * User Routes
 * 
 * Defines user profile management API routes for the FreshFarmily system
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, requireActiveUser, requirePermissions } = require('../middleware/auth');
const logger = require('../utils/logger');
const { User, Profile } = require('../models/user');

const router = express.Router();

/**
 * @route GET /api/users/profile
 * @description Get current user's profile
 * @access Private
 */
router.get('/profile', [authenticate, requireActiveUser], async (req, res) => {
  try {
    // Get user with profile
    const user = await User.findByPk(req.user.userId, {
      include: [{
        model: Profile,
        as: 'Profile'
      }]
    });
    
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User profile not found'
      });
    }
    
    // Return user data without sensitive fields
    const userJSON = user.toJSON();
    delete userJSON.password;
    delete userJSON.verificationToken;
    delete userJSON.passwordResetToken;
    delete userJSON.passwordResetExpires;
    delete userJSON.refreshToken;
    
    return res.status(200).json({ user: userJSON });
  } catch (error) {
    logger.error(`Error fetching user profile: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve user profile'
    });
  }
});

/**
 * @route PUT /api/users/profile
 * @description Update current user's profile
 * @access Private
 */
router.put('/profile', [
  authenticate,
  requireActiveUser,
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty if provided'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty if provided'),
  body('profile.address').optional().trim(),
  body('profile.city').optional().trim(),
  body('profile.state').optional().trim(),
  body('profile.zipCode').optional().trim(),
  body('profile.phone').optional().trim(),
  body('profile.bio').optional().trim()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Get current user
    const user = await User.findByPk(req.user.userId, {
      include: [{
        model: Profile,
        as: 'Profile'
      }]
    });
    
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    // Start a transaction
    const transaction = await require('../config/database').sequelize.transaction();
    
    try {
      // Update user data
      if (req.body.firstName) user.firstName = req.body.firstName;
      if (req.body.lastName) user.lastName = req.body.lastName;
      
      // Save user changes
      await user.save({ transaction });
      
      // Update profile if provided
      if (req.body.profile) {
        // Get or create profile
        let profile = user.Profile;
        if (!profile) {
          profile = await Profile.create({
            userId: user.id
          }, { transaction });
        }
        
        // Update profile fields
        const profileFields = ['address', 'city', 'state', 'zipCode', 'phone', 'bio'];
        profileFields.forEach(field => {
          if (req.body.profile[field] !== undefined) {
            profile[field] = req.body.profile[field];
          }
        });
        
        // Save profile changes
        await profile.save({ transaction });
      }
      
      // Commit the transaction
      await transaction.commit();
      
      // Return updated user data
      const updatedUser = await User.findByPk(req.user.userId, {
        include: [{
          model: Profile,
          as: 'Profile'
        }]
      });
      
      // Remove sensitive data
      const userJSON = updatedUser.toJSON();
      delete userJSON.password;
      delete userJSON.verificationToken;
      delete userJSON.passwordResetToken;
      delete userJSON.passwordResetExpires;
      delete userJSON.refreshToken;
      
      return res.status(200).json({
        message: 'Profile updated successfully',
        user: userJSON
      });
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error(`Error updating user profile: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user profile'
    });
  }
});

/**
 * @route GET /api/users/profile/addresses
 * @description Get user's addresses
 * @access Private
 */
router.get('/profile/addresses', [authenticate, requireActiveUser], async (req, res) => {
  try {
    // For MVP, returning mock data
    // In a production app, this would query a real database table
    return res.status(200).json([
      {
        id: '1',
        userId: req.user.userId,
        name: 'Home',
        streetAddress: '123 Main St',
        unit: 'Apt 4B',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        country: 'USA',
        phone: '415-555-1234',
        isDefault: true,
        type: 'both'
      }
    ]);
  } catch (error) {
    logger.error(`Error fetching addresses: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve addresses'
    });
  }
});

/**
 * @route POST /api/users/profile/addresses
 * @description Add a new address
 * @access Private
 */
router.post('/profile/addresses', [authenticate, requireActiveUser], async (req, res) => {
  try {
    // For MVP, returning mock data
    // In a production app, this would create a real record
    return res.status(201).json({
      id: Date.now().toString(),
      userId: req.user.userId,
      ...req.body,
      isDefault: req.body.isDefault || false
    });
  } catch (error) {
    logger.error(`Error adding address: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add address'
    });
  }
});

/**
 * @route PUT /api/users/profile/addresses/:id
 * @description Update an address
 * @access Private
 */
router.put('/profile/addresses/:id', [authenticate, requireActiveUser], async (req, res) => {
  try {
    // For MVP, returning mock data
    // In a production app, this would update a real record
    return res.status(200).json({
      id: req.params.id,
      userId: req.user.userId,
      ...req.body
    });
  } catch (error) {
    logger.error(`Error updating address: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update address'
    });
  }
});

/**
 * @route DELETE /api/users/profile/addresses/:id
 * @description Delete an address
 * @access Private
 */
router.delete('/profile/addresses/:id', [authenticate, requireActiveUser], async (req, res) => {
  try {
    // For MVP, returning success
    // In a production app, this would delete a real record
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error(`Error deleting address: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete address'
    });
  }
});

/**
 * @route GET /api/users/profile/payment-methods
 * @description Get user's payment methods
 * @access Private
 */
router.get('/profile/payment-methods', [authenticate, requireActiveUser], async (req, res) => {
  try {
    // For MVP, returning mock data
    return res.status(200).json([
      {
        id: '1',
        userId: req.user.userId,
        type: 'card',
        cardBrand: 'Visa',
        lastFour: '4242',
        expiryMonth: '12',
        expiryYear: '2025',
        name: 'Personal Card',
        isDefault: true
      }
    ]);
  } catch (error) {
    logger.error(`Error fetching payment methods: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve payment methods'
    });
  }
});

/**
 * @route POST /api/users/profile/payment-methods
 * @description Add a new payment method
 * @access Private
 */
router.post('/profile/payment-methods', [authenticate, requireActiveUser], async (req, res) => {
  try {
    // For MVP, returning mock data
    return res.status(201).json({
      id: Date.now().toString(),
      userId: req.user.userId,
      ...req.body,
      isDefault: req.body.isDefault || false
    });
  } catch (error) {
    logger.error(`Error adding payment method: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add payment method'
    });
  }
});

/**
 * @route DELETE /api/users/profile/payment-methods/:id
 * @description Delete a payment method
 * @access Private
 */
router.delete('/profile/payment-methods/:id', [authenticate, requireActiveUser], async (req, res) => {
  try {
    // For MVP, returning success
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error(`Error deleting payment method: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete payment method'
    });
  }
});

/**
 * @route POST /api/users/profile/payment-methods/:id/default
 * @description Set a payment method as default
 * @access Private
 */
router.post('/profile/payment-methods/:id/default', [authenticate, requireActiveUser], async (req, res) => {
  try {
    // For MVP, returning success
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error(`Error setting default payment method: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to set default payment method'
    });
  }
});

/**
 * @route GET /api/users/profile/preferences
 * @description Get user preferences
 * @access Private
 */
router.get('/profile/preferences', [authenticate, requireActiveUser], async (req, res) => {
  try {
    // For MVP, returning mock data
    return res.status(200).json({
      emailNotifications: true,
      smsNotifications: false,
      marketingEmails: true,
      orderUpdates: true,
      promotions: false,
      referralEnabled: true
    });
  } catch (error) {
    logger.error(`Error fetching preferences: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve preferences'
    });
  }
});

/**
 * @route PUT /api/users/profile/preferences
 * @description Update user preferences
 * @access Private
 */
router.put('/profile/preferences', [authenticate, requireActiveUser], async (req, res) => {
  try {
    // For MVP, returning the updated preferences
    return res.status(200).json({
      ...req.body
    });
  } catch (error) {
    logger.error(`Error updating preferences: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update preferences'
    });
  }
});

/**
 * @route GET /api/users/profile/referrals
 * @description Get user's referral information
 * @access Private
 */
router.get('/profile/referrals', [authenticate, requireActiveUser], async (req, res) => {
  try {
    // For MVP, returning mock data
    // In a production app, this would fetch from a real database
    const userId = req.user.userId;
    const randomCode = 'FRESH' + userId.substring(0, 4).toUpperCase();
    
    return res.status(200).json({
      code: randomCode,
      totalReferrals: 3,
      pendingReferrals: 1,
      completedReferrals: 2,
      referralCredits: 15
    });
  } catch (error) {
    logger.error(`Error fetching referral information: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve referral information'
    });
  }
});

/**
 * @route GET /api/users
 * @description Get all users (admin only)
 * @access Private (Admin only)
 */
router.get('/', [authenticate, requireActiveUser, requirePermissions(['admin'])], async (req, res) => {
  try {
    // Get query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Get users with profiles
    const { count, rows: users } = await User.findAndCountAll({
      include: [{
        model: Profile,
        as: 'Profile'
      }],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    // Remove sensitive data
    const sanitizedUsers = users.map(user => {
      const userJSON = user.toJSON();
      delete userJSON.password;
      delete userJSON.verificationToken;
      delete userJSON.passwordResetToken;
      delete userJSON.passwordResetExpires;
      delete userJSON.refreshToken;
      return userJSON;
    });
    
    return res.status(200).json({
      users: sanitizedUsers,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    logger.error(`Error fetching users: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve users'
    });
  }
});

/**
 * @route GET /api/users/:id
 * @description Get user by ID (admin only)
 * @access Private (Admin only)
 */
router.get('/:id', [authenticate, requireActiveUser, requirePermissions(['admin'])], async (req, res) => {
  try {
    // Get user with profile
    const user = await User.findByPk(req.params.id, {
      include: [{
        model: Profile,
        as: 'Profile'
      }]
    });
    
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    // Remove sensitive data
    const userJSON = user.toJSON();
    delete userJSON.password;
    delete userJSON.verificationToken;
    delete userJSON.passwordResetToken;
    delete userJSON.passwordResetExpires;
    delete userJSON.refreshToken;
    
    return res.status(200).json({ user: userJSON });
  } catch (error) {
    logger.error(`Error fetching user by ID: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve user'
    });
  }
});

/**
 * @route PUT /api/users/:id/status
 * @description Update user status (admin only)
 * @access Private (Admin only)
 */
router.put('/:id/status', [
  authenticate,
  requireActiveUser,
  requirePermissions(['admin']),
  body('status').isIn(['active', 'pending', 'suspended', 'deleted']).withMessage('Invalid status')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Get user
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    // Update status
    user.status = req.body.status;
    await user.save();
    
    return res.status(200).json({
      message: `User status updated to ${req.body.status}`,
      userId: user.id,
      status: user.status
    });
  } catch (error) {
    logger.error(`Error updating user status: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user status'
    });
  }
});

/**
 * @route DELETE /api/users/:id
 * @description Delete a user (admin only)
 * @access Private (Admin only)
 */
router.delete('/:id', [authenticate, requireActiveUser, requirePermissions(['admin'])], async (req, res) => {
  try {
    // Get user
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    // Prevent deleting admin users (except by other admins)
    if (user.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot delete admin user'
      });
    }
    
    // Soft delete - update status to 'deleted'
    user.status = 'deleted';
    await user.save();
    
    // Alternatively, for hard delete:
    // await user.destroy();
    
    return res.status(200).json({
      message: 'User deleted successfully',
      userId: user.id
    });
  } catch (error) {
    logger.error(`Error deleting user: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete user'
    });
  }
});

module.exports = router;
