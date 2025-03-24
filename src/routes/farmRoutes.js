/**
 * Farm Routes
 * 
 * Defines the farm management API routes for the FreshFarmily system
 */

const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { authenticate, requireActiveUser, requirePermissions } = require('../middleware/auth');
const logger = require('../utils/logger');
const { Farm, FarmPhoto } = require('../models/farm');
const { Product } = require('../models/product');
const { User } = require('../models/user');
const { sequelize } = require('../config/database');
const searchService = require('../services/searchService');

// Create a router for specific non-ID routes
const router = express.Router();

// Create a separate router for ID-specific routes
const idRouter = express.Router({ mergeParams: true });

/**
 * @route GET /api/farms/search
 * @description Search farms by name, description, or location
 * @access Public
 */
router.get('/search', [
  query('q').optional().trim(),
  query('city').optional().trim(),
  query('province').optional().trim(),
  query('isVerified').optional().isBoolean(),
  query('acceptsDelivery').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Extract query params
    const { q = '', city, province, isVerified, acceptsDelivery } = req.query;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    
    // Log the search request
    logger.info(`Farm search request: query="${q}", filters={city:${city},province:${province},verified:${isVerified},delivery:${acceptsDelivery}}`);
    console.log(`Farm search request: query="${q}", page=${page}, pageSize=${pageSize}`);

    // Create filters object
    const filters = {
      city,
      province,
      isVerified: isVerified === 'true' ? true : (isVerified === 'false' ? false : undefined),
      acceptsDelivery: acceptsDelivery === 'true' ? true : (acceptsDelivery === 'false' ? false : undefined)
    };

    // If no search query provided, fallback to listing farms with filters
    if (!q.trim()) {
      logger.info('No search query provided, falling back to farm listing with filters');
      console.log('No search query provided, falling back to farm listing with filters');
      
      // Get farms with pagination and filtering
      const limit = pageSize;
      const offset = (page - 1) * limit;
      
      const queryOptions = {
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        where: {}
      };
      
      // Apply filters
      if (filters.city) queryOptions.where.city = filters.city;
      if (filters.province) queryOptions.where.province = filters.province;
      if (filters.isVerified !== undefined) queryOptions.where.isVerified = filters.isVerified;
      if (filters.acceptsDelivery !== undefined) queryOptions.where.acceptsDelivery = filters.acceptsDelivery;
      
      // Only show active farms by default
      queryOptions.where.status = 'active';
      
      // Execute query
      try {
        console.log('Executing Farm.findAndCountAll with options:', JSON.stringify(queryOptions, null, 2));
        const { count, rows: farms } = await Farm.findAndCountAll(queryOptions);
        
        console.log(`Found ${count} farms with filters`);
        
        // Map state field to province for frontend compatibility
        const mappedFarms = farms.map(farm => {
          const farmData = farm.toJSON();
          farmData.province = farmData.state;
          return farmData;
        });

        return res.status(200).json({
          success: true,
          query: '',
          results: mappedFarms,
          totalResults: count,
          page,
          totalPages: Math.ceil(count / pageSize)
        });
      } catch (farmQueryError) {
        logger.error(`Error executing farm query: ${farmQueryError.message}`);
        throw farmQueryError;
      }
    } else {
      // Perform search with the provided query
      const searchResults = await searchService.searchFarms(q, filters, page, pageSize);
      
      res.status(200).json({
        success: true,
        query: q,
        ...searchResults
      });
    }
  } catch (error) {
    logger.error(`Error searching farms: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to search farms',
      message: error.message
    });
  }
});

/**
 * @route GET /api/farms
 * @description Get all farms with pagination and filtering
 * @access Public
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional(),
  query('zipCode').optional(),
  query('status').optional().isIn(['active', 'pending', 'suspended']).withMessage('Invalid status value'),
  query('verified').optional().isBoolean().withMessage('Verified must be true or false')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    logger.debug(`Processing request to get farms with page=${page}, limit=${limit}`);

    // Build query options
    const queryOptions = {
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        as: 'Farmer',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }, {
        model: FarmPhoto,
        as: 'Photos',
        required: false
      }],
      where: {}
    };

    // Add filters if provided
    if (req.query.status) {
      queryOptions.where.status = req.query.status;
    }

    if (req.query.verified === 'true') {
      queryOptions.where.isVerified = true;
    } else if (req.query.verified === 'false') {
      queryOptions.where.isVerified = false;
    }

    if (req.query.search) {
      queryOptions.where.name = { [sequelize.Op.iLike]: `%${req.query.search}%` };
    }

    if (req.query.zipCode) {
      queryOptions.where.zipCode = req.query.zipCode;
    }

    // Perform the query
    const { count, rows: farms } = await Farm.findAndCountAll(queryOptions);

    logger.info(`Successfully retrieved ${farms.length} farms out of ${count} total`);

    // Map state field to province for frontend compatibility
    const mappedFarms = farms.map(farm => {
      const farmData = farm.toJSON();
      farmData.province = farmData.state;
      return farmData;
    });

    // Return paginated results
    res.status(200).json({
      success: true,
      farms: mappedFarms,
      totalFarms: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    logger.error(`Error retrieving farms: ${error.message}`);
    console.log(error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve farms'
    });
  }
});

/**
 * @route POST /api/farms
 * @description Create a new farm
 * @access Private (farmers only)
 */
router.post('/', [
  authenticate,
  requireActiveUser,
  requirePermissions(['write']),
  body('name').trim().notEmpty().withMessage('Farm name is required'),
  body('description').optional().trim(),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('province').optional().trim(),
  body('state').optional().custom((value, { req }) => {
    // Either province or state must be provided
    if (!value && !req.body.province) {
      throw new Error('Province/State is required');
    }
    return true;
  }),
  body('zipCode').trim().notEmpty().withMessage('ZIP code is required')
    .custom((value) => {
      // Accept both Canadian postal codes (with or without spaces) and US ZIP codes
      // Canadian: A1A 1A1 or A1A1A1
      // US: 12345 or 12345-6789
      const canadianPattern = /^[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJKLMNPRSTVWXYZ][ ]?\d[ABCEGHJKLMNPRSTVWXYZ]\d$/i;
      const usPattern = /^\d{5}(-\d{4})?$/;
      
      if (canadianPattern.test(value) || usPattern.test(value)) {
        return true;
      }
      
      return false;
    }).withMessage('Invalid ZIP/postal code format'),
  body('phoneNumber').optional().trim(),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('website').optional().trim().custom((value) => {
    // If website is empty or not provided, it's valid
    if (!value || value.trim() === '') {
      return true;
    }
    
    // Check if it's a valid URL if provided
    try {
      // Ensure it has a protocol
      let url = value;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }).withMessage('Invalid website URL'),
  body('acceptsDelivery').optional().isBoolean(),
  body('deliveryRange').optional().isFloat({ min: 0 }),
  body('certifications').optional().isArray()
], async (req, res) => {
  try {
    // Log the incoming request body for debugging
    logger.info(`New farm creation request received: ${JSON.stringify(req.body)}`, { service: 'freshfarmily-api' });

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Log detailed validation errors to help debugging
      logger.error(`Farm validation failed: ${JSON.stringify(errors.array())}`, { service: 'freshfarmily-api' });
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    // Check if user is a farmer
    if (req.user.role !== 'farmer' && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only farmers can create farms'
      });
    }

    // Check if user already has a farm
    const existingFarm = await Farm.findOne({
      where: { farmerId: req.user.userId }
    });

    if (existingFarm && req.user.role !== 'admin') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'You already have a registered farm'
      });
    }

    // Remove any pickup-related fields from the request
    // since FreshFarmily now handles all deliveries
    const farmData = { ...req.body };
    delete farmData.acceptsPickup;
    delete farmData.pickupInstructions;
    
    // Handle field name differences between frontend and backend
    if (farmData.province) {
      farmData.state = farmData.province;
      delete farmData.province;
    }
    
    // Set default values
    farmData.acceptsDelivery = true; // All farms must accept delivery now
    farmData.deliveryRange = farmData.deliveryRange || 25; // Default delivery range

    // Create farm
    const farm = await Farm.create({
      ...farmData,
      farmerId: req.user.userId,
      status: 'pending', // New farms start as pending until approved by admin
      isVerified: false
    });

    logger.info(`New farm created: ${farm.name} by user ${req.user.userId}`);

    return res.status(201).json({
      message: 'Farm created successfully. It is pending approval.',
      farm
    });
  } catch (error) {
    logger.error(`Error creating farm: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create farm'
    });
  }
});

/**
 * @route GET /api/farms/farmer/:userId
 * @description Get farms by farmer ID
 * @access Private
 */
router.get('/farmer/:userId', [
  authenticate,
  requireActiveUser
], async (req, res) => {
  try {
    // Get user ID from params
    const { userId } = req.params;
    
    // Skip strict UUID validation but ensure we have a user ID
    if (!userId) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'User ID is required' 
      });
    }

    // Check authorization
    const isAuthorized = req.user.userId === userId || req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view these farms'
      });
    }

    // Get farms for the farmer
    const farms = await Farm.findAll({
      where: { farmerId: userId },
      include: [
        {
          model: FarmPhoto,
          as: 'Photos',
          limit: 5,
          order: [['isMain', 'DESC'], ['order', 'ASC']]
        }
      ]
    });

    // Map state field to province for frontend compatibility
    const mappedFarms = farms.map(farm => {
      const farmData = farm.toJSON();
      farmData.province = farmData.state;
      return farmData;
    });

    return res.status(200).json({ farms: mappedFarms });
  } catch (error) {
    logger.error(`Error fetching farms for farmer: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve farms'
    });
  }
});

// Mount the ID router for all ID-specific routes
router.use('/:id', idRouter);

/**
 * @route GET /api/farms/:id
 * @description Get farm by ID with products
 * @access Public
 */
idRouter.get('/', [
  param('id').isUUID().withMessage('Invalid farm ID')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get farm with products
    const farm = await Farm.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'Farmer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: FarmPhoto,
          as: 'Photos',
          order: [['isMain', 'DESC'], ['order', 'ASC']]
        },
        {
          model: Product,
          as: 'Products',
          where: { isAvailable: true, status: 'active' },
          required: false
        }
      ]
    });

    if (!farm) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Farm not found'
      });
    }

    // Map state field to province for frontend compatibility
    const farmData = farm.toJSON();
    farmData.province = farmData.state;

    return res.status(200).json({ farm: farmData });
  } catch (error) {
    logger.error(`Error fetching farm: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve farm'
    });
  }
});

/**
 * @route PUT /api/farms/:id
 * @description Update farm details
 * @access Private (farm owner or admin)
 */
idRouter.put('/', [
  authenticate,
  requireActiveUser,
  requirePermissions(['update']),
  param('id').isUUID().withMessage('Invalid farm ID'),
  body('name').optional().trim().notEmpty().withMessage('Farm name cannot be empty if provided'),
  body('description').optional().trim(),
  body('address').optional().trim().notEmpty().withMessage('Address cannot be empty if provided'),
  body('city').optional().trim().notEmpty().withMessage('City cannot be empty if provided'),
  body('province').optional().trim(),
  body('state').optional().custom((value, { req }) => {
    // Either province or state must be provided
    if (!value && !req.body.province) {
      throw new Error('Province/State is required');
    }
    return true;
  }),
  body('zipCode').optional().trim().notEmpty().withMessage('ZIP code cannot be empty if provided')
    .custom((value) => {
      // Accept both Canadian postal codes (with or without spaces) and US ZIP codes
      // Canadian: A1A 1A1 or A1A1A1
      // US: 12345 or 12345-6789
      const canadianPattern = /^[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJKLMNPRSTVWXYZ][ ]?\d[ABCEGHJKLMNPRSTVWXYZ]\d$/i;
      const usPattern = /^\d{5}(-\d{4})?$/;
      
      if (canadianPattern.test(value) || usPattern.test(value)) {
        return true;
      }
      
      return false;
    }).withMessage('Invalid ZIP/postal code format'),
  body('phoneNumber').optional().trim(),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('website').optional().trim().custom((value) => {
    // If website is empty or not provided, it's valid
    if (!value || value.trim() === '') {
      return true;
    }
    
    // Check if it's a valid URL if provided
    try {
      // Ensure it has a protocol
      let url = value;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }).withMessage('Invalid website URL'),
  body('acceptsDelivery').optional().isBoolean(),
  body('deliveryRange').optional().isFloat({ min: 0 }),
  body('certifications').optional().isArray()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get farm
    const farm = await Farm.findByPk(req.params.id);

    if (!farm) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Farm not found'
      });
    }

    // Check authorization
    if (farm.farmerId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update this farm'
      });
    }

    // Admin-only fields
    const adminFields = ['isVerified', 'status'];

    // Remove admin-only fields if not admin
    if (req.user.role !== 'admin') {
      adminFields.forEach(field => {
        if (req.body[field] !== undefined) {
          delete req.body[field];
        }
      });
    }

    // Handle field name differences between frontend and backend
    if (req.body.province) {
      req.body.state = req.body.province;
      delete req.body.province;
    }
    
    // Update farm
    await farm.update(req.body);

    logger.info(`Farm updated: ${farm.name}`);

    // Map state field to province for frontend compatibility
    const farmData = farm.toJSON();
    farmData.province = farmData.state;

    return res.status(200).json({
      message: 'Farm updated successfully',
      farm: farmData
    });
  } catch (error) {
    logger.error(`Error updating farm: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update farm'
    });
  }
});

/**
 * @route PUT /api/farms/:id/status
 * @description Update farm status (admin only)
 * @access Private (admin only)
 */
idRouter.put('/status', [
  authenticate,
  requireActiveUser,
  requirePermissions(['admin']),
  param('id').isUUID().withMessage('Invalid farm ID'),
  body('status').isIn(['active', 'pending', 'suspended', 'closed']).withMessage('Invalid status'),
  body('isVerified').optional().isBoolean()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get farm
    const farm = await Farm.findByPk(req.params.id);

    if (!farm) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Farm not found'
      });
    }

    // Update status and verification
    const updateFields = { status: req.body.status };

    if (req.body.isVerified !== undefined) {
      updateFields.isVerified = req.body.isVerified;
    }

    await farm.update(updateFields);

    logger.info(`Farm status updated: ${farm.name}, status: ${farm.status}, verified: ${farm.isVerified}`);

    // Map state field to province for frontend compatibility
    const farmData = farm.toJSON();
    farmData.province = farmData.state;

    return res.status(200).json({
      message: 'Farm status updated successfully',
      farm: farmData
    });
  } catch (error) {
    logger.error(`Error updating farm status: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update farm status'
    });
  }
});

/**
 * @route DELETE /api/farms/:id
 * @description Delete a farm
 * @access Private (farm owner or admin)
 */
idRouter.delete('/', [
  authenticate,
  requireActiveUser,
  requirePermissions(['delete']),
  param('id').isUUID().withMessage('Invalid farm ID')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get farm
    const farm = await Farm.findByPk(req.params.id);

    if (!farm) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Farm not found'
      });
    }

    // Check authorization
    const canDelete = req.user.role === 'admin' ||
      (req.user.role === 'farmer' &&
        farm.farmerId === req.user.userId &&
        req.user.permissions.includes('delete_own'));

    if (!canDelete) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this farm'
      });
    }

    // Delete farm (will cascade delete related entities)
    const farmName = farm.name;
    await farm.destroy();

    logger.info(`Farm deleted: ${farmName}`);

    return res.status(200).json({
      message: 'Farm deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting farm: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete farm'
    });
  }
});

/**
 * @route GET /api/farms/:id/products
 * @description Get all products for a specific farm
 * @access Public
 */
idRouter.get('/products', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, category, sort = 'createdAt', order = 'DESC' } = req.query;

    // Find the farm first
    const farm = await Farm.findByPk(id);
    if (!farm) {
      return res.status(200).json({
        success: true,
        message: 'Farm not found',
        farm: null,
        products: []
      });
    }

    // Build query options
    const queryOptions = {
      where: { farmId: id },
      include: [
        {
          model: ProductPhoto,
          as: 'ProductPhotos',
          required: false,
          limit: 5,
          order: [['isMain', 'DESC'], ['order', 'ASC']]
        }
      ],
      order: [[sort, order]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    // Add category filter if provided
    if (category) {
      queryOptions.where.category = category;
    }

    // Get products
    const products = await Product.findAll(queryOptions);

    // Map state to province for frontend compatibility
    const farmData = farm.toJSON();
    farmData.province = farmData.state;

    return res.status(200).json({
      farm: farmData,
      products
    });
  } catch (error) {
    logger.error(`Error fetching farm products: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching farm products',
      error: error.message,
      products: []
    });
  }
});

/**
 * @route PUT /api/farms/:id/set-default
 * @description Set a farm as the default farm for a farmer
 * @access Private (farm owner only)
 */
idRouter.put('/set-default', [
  authenticate,
  requireActiveUser,
  param('id').isUUID().withMessage('Invalid farm ID')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get farm
    const farm = await Farm.findByPk(req.params.id);

    if (!farm) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Farm not found'
      });
    }

    // Check authorization
    if (farm.farmerId !== req.user.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update this farm'
      });
    }

    // Transaction to ensure only one default farm per farmer
    const transaction = await sequelize.transaction();

    try {
      // Reset all default farms for this farmer
      await Farm.update(
        { isDefault: false },
        { 
          where: { farmerId: req.user.userId }, 
          transaction 
        }
      );

      // Set this farm as default
      await farm.update({ isDefault: true }, { transaction });

      // Commit transaction
      await transaction.commit();

      logger.info(`Farm set as default: ${farm.name}`);

      // Map state field to province for frontend compatibility
      const farmData = farm.toJSON();
      farmData.province = farmData.state;

      return res.status(200).json({
        message: 'Farm set as default successfully',
        farm: farmData
      });
    } catch (err) {
      // Rollback if error
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    logger.error(`Error setting default farm: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to set default farm'
    });
  }
});

/**
 * @route GET /api/farms/default
 * @description Get the default farm for the current user
 * @access Private (farmer only)
 */
router.get('/default', [
  authenticate,
  requireActiveUser
], async (req, res) => {
  try {
    // Ensure user is a farmer
    if (req.user.role !== 'farmer') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only farmers can access this endpoint'
      });
    }

    // Find default farm or first farm if no default set
    const defaultFarm = await Farm.findOne({
      where: { 
        farmerId: req.user.userId,
        isDefault: true
      },
      include: [
        {
          model: FarmPhoto,
          as: 'Photos',
          limit: 5,
          order: [['isMain', 'DESC'], ['order', 'ASC']]
        }
      ]
    });

    // If there's no default farm, try to get the first farm
    if (!defaultFarm) {
      const firstFarm = await Farm.findOne({
        where: { farmerId: req.user.userId },
        include: [
          {
            model: FarmPhoto,
            as: 'Photos',
            limit: 5,
            order: [['isMain', 'DESC'], ['order', 'ASC']]
          }
        ],
        order: [['createdAt', 'ASC']]
      });

      // If there's a farm, set it as default
      if (firstFarm) {
        await firstFarm.update({ isDefault: true });
        // Map state field to province for frontend compatibility
        const farmData = firstFarm.toJSON();
        farmData.province = farmData.state;
        return res.status(200).json({ farm: farmData });
      }

      // No farms found
      return res.status(200).json({ 
        success: true,
        message: 'No farms available',
        farm: null 
      });
    }

    // Map state field to province for frontend compatibility
    const farmData = defaultFarm.toJSON();
    farmData.province = farmData.state;

    return res.status(200).json({ farm: farmData });
  } catch (error) {
    logger.error(`Error fetching default farm: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve default farm'
    });
  }
});

/**
 * @route GET /api/farms/:farmId/products
 * @description Get products for a specific farm ID
 * @access Public
 */
router.get('/:farmId/products', async (req, res) => {
  try {
    const { farmId } = req.params;
    const { page = 1, limit = 20, category, isOrganic } = req.query;

    // Verify the farm exists
    const farm = await Farm.findByPk(farmId);
    if (!farm) {
      return res.status(200).json({
        success: true,
        message: 'Farm not found',
        products: []
      });
    }

    // Build query options
    const queryOptions = {
      where: { farmId },
      include: [
        {
          model: ProductPhoto,
          as: 'ProductPhotos',
          required: false,
          limit: 5,
          order: [['isMain', 'DESC'], ['order', 'ASC']]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    // Apply filters if provided
    if (category) {
      queryOptions.where.category = category;
    }

    if (isOrganic !== undefined) {
      queryOptions.where.isOrganic = isOrganic === 'true';
    }

    // Get products
    const products = await Product.findAll(queryOptions);

    // Map state to province for frontend compatibility
    const farmData = farm.toJSON();
    farmData.province = farmData.state;

    return res.status(200).json({
      success: true,
      farm: farmData,
      products: products
    });
  } catch (error) {
    logger.error(`Error fetching products for farm: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching farm products',
      error: error.message,
      products: []
    });
  }
});

/**
 * @route GET /api/farms/default/:userId
 * @description Get default farm for user
 * @access Private
 */
router.get('/default/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate userId
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Find default farm for user
    const farm = await Farm.findOne({
      where: {
        farmerId: userId,
        isDefault: true
      },
      include: [
        { model: FarmPhoto, as: 'Photos' }
      ]
    });

    // Return farm or empty object with 200 status
    return res.status(200).json({
      success: true,
      farm: farm || null
    });
  } catch (error) {
    logger.error(`Error retrieving default farm: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Error retrieving default farm',
      message: error.message
    });
  }
});

/**
 * Get products for a farm
 * @route GET /farms/:farmId/products
 */
router.get('/:farmId/products', async (req, res) => {
  try {
    const { farmId } = req.params;
    
    // Validate farmId
    if (!farmId) {
      return res.status(400).json({
        success: false,
        error: 'Farm ID is required'
      });
    }

    // Check if the farm exists
    const farm = await Farm.findByPk(farmId);
    if (!farm) {
      // Return empty array instead of 404, to avoid frontend errors
      return res.status(200).json({
        success: true,
        products: []
      });
    }

    // Find products for this farm
    const products = await Product.findAll({
      where: {
        farmId: farmId
      },
      include: [
        { model: ProductPhoto, as: 'Photos' }
      ]
    });

    // Return products (could be empty array)
    return res.status(200).json({
      success: true,
      products: products
    });
  } catch (error) {
    logger.error(`Error retrieving products for farm: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Error retrieving products for farm',
      message: error.message
    });
  }
});

module.exports = router;
