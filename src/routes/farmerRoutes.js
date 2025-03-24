const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { authenticate, requireActiveUser, requirePermissions } = require('../middleware/auth');
const { User, Farm } = require('../models');
const logger = require('../utils/logger');

/**
 * @route GET /api/farmers/:id/profile
 * @description Get a farmer's profile
 * @access Private
 */
router.get('/:id/profile', [
  authenticate,
  requireActiveUser,
  param('id').isUUID().withMessage('Invalid farmer ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    logger.info(`Fetching profile for farmer ID: ${id}`);
    
    // Check authorization - users can only view their own profile unless admin
    if (req.user.userId !== id && req.user.role !== 'admin') {
      logger.warn(`Unauthorized access attempt to farmer profile: ${id} by user: ${req.user.userId}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view this profile'
      });
    }

    // Debug log for models availability
    logger.debug(`Attempting to query User model`);
    
    // Find the farmer
    const farmer = await User.findOne({
      where: { id }
      // Don't filter by role: 'farmer' as this may be too restrictive
      // attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'bio', 'createdAt', 'profileImage']
    });

    if (!farmer) {
      logger.warn(`Farmer profile not found for ID: ${id}`);
      return res.status(404).json({
        error: 'Not Found',
        message: 'Farmer profile not found'
      });
    }

    logger.info(`Found farmer profile: ${farmer.id}`);

    // Count farmer's farms
    let farmCount = 0;
    try {
      farmCount = await Farm.count({ where: { farmerId: id } });
      logger.info(`Farm count for farmer ${id}: ${farmCount}`);
    } catch (farmCountError) {
      logger.error(`Error counting farms: ${farmCountError.message}`);
      // Continue with farmCount = 0, don't fail the request
    }

    // Format the response
    const profile = {
      id: farmer.id,
      firstName: farmer.firstName || '',
      lastName: farmer.lastName || '',
      email: farmer.email || '',
      phone: farmer.phone || '',
      bio: farmer.bio || '',
      joinedDate: farmer.createdAt,
      farmCount,
      profileImage: farmer.profileImage || '',
      role: farmer.role || 'farmer'
    };

    logger.info(`Successfully prepared profile response for farmer: ${id}`);
    return res.status(200).json(profile);
  } catch (error) {
    logger.error(`Error getting farmer profile: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get farmer profile'
    });
  }
});

/**
 * @route PUT /api/farmers/:id/profile
 * @description Update a farmer's profile
 * @access Private
 */
router.put('/:id/profile', [
  authenticate,
  requireActiveUser,
  requirePermissions(['update']),
  param('id').isUUID().withMessage('Invalid farmer ID'),
  body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('phone').optional().trim(),
  body('bio').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    
    // Check authorization - users can only update their own profile unless admin
    if (req.user.userId !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update this profile'
      });
    }

    // Find the farmer
    const farmer = await User.findOne({
      where: { id, role: 'farmer' }
    });

    if (!farmer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Farmer profile not found'
      });
    }

    // Update the profile
    const { firstName, lastName, phone, bio } = req.body;
    const fieldsToUpdate = {};
    
    if (firstName !== undefined) fieldsToUpdate.firstName = firstName;
    if (lastName !== undefined) fieldsToUpdate.lastName = lastName;
    if (phone !== undefined) fieldsToUpdate.phone = phone;
    if (bio !== undefined) fieldsToUpdate.bio = bio;

    await farmer.update(fieldsToUpdate);

    // Count farmer's farms
    const farmCount = await Farm.count({ where: { farmerId: id } });

    // Format the response
    const updatedProfile = {
      id: farmer.id,
      firstName: farmer.firstName,
      lastName: farmer.lastName,
      email: farmer.email,
      phone: farmer.phone || '',
      bio: farmer.bio || '',
      joinedDate: farmer.createdAt,
      farmCount,
      profileImage: farmer.profileImage || ''
    };

    return res.status(200).json(updatedProfile);
  } catch (error) {
    logger.error(`Error updating farmer profile: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update farmer profile'
    });
  }
});

module.exports = router;
