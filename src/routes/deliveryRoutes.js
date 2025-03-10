/**
 * Delivery Routes
 * 
 * Defines the delivery management API routes for the FreshFarmily system
 */

const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { authenticate, requireActiveUser, requirePermissions } = require('../middleware/auth');
const logger = require('../utils/logger');
const { Delivery } = require('../models/delivery');
const { Order } = require('../models/order');
const { User } = require('../models/user');

const router = express.Router();

/**
 * @route GET /api/deliveries
 * @description Get all deliveries with pagination and filtering
 * @access Private (admin only)
 */
router.get('/', [
  authenticate,
  requireActiveUser,
  requirePermissions(['read']),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'assigned', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid status'),
  query('driverId').optional().isUUID().withMessage('Invalid driver ID'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Build query with filters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const queryOptions = {
      where: {},
      include: [
        {
          model: Order,
          attributes: ['id', 'orderNumber', 'totalAmount', 'createdAt']
        },
        {
          model: User,
          as: 'Driver',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    };
    
    // Add filters
    if (req.query.status) {
      queryOptions.where.status = req.query.status;
    }
    
    if (req.query.driverId) {
      queryOptions.where.driverId = req.query.driverId;
    } else if (req.user.role === 'driver') {
      // Drivers can only see their own deliveries
      queryOptions.where.driverId = req.user.userId;
    }
    
    if (req.query.startDate && req.query.endDate) {
      queryOptions.where.scheduledDeliveryTime = {
        [sequelize.Op.between]: [
          new Date(req.query.startDate),
          new Date(req.query.endDate)
        ]
      };
    } else if (req.query.startDate) {
      queryOptions.where.scheduledDeliveryTime = {
        [sequelize.Op.gte]: new Date(req.query.startDate)
      };
    } else if (req.query.endDate) {
      queryOptions.where.scheduledDeliveryTime = {
        [sequelize.Op.lte]: new Date(req.query.endDate)
      };
    }
    
    // Execute query
    const { count, rows: deliveries } = await Delivery.findAndCountAll(queryOptions);
    
    return res.status(200).json({
      deliveries,
      totalCount: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    logger.error(`Error fetching deliveries: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve deliveries'
    });
  }
});

/**
 * @route GET /api/deliveries/:id
 * @description Get delivery by ID
 * @access Private (admin, driver assigned to delivery, or consumer who placed the order)
 */
router.get('/:id', [
  authenticate,
  requireActiveUser,
  requirePermissions(['read']),
  param('id').isUUID().withMessage('Invalid delivery ID')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get delivery with details
    const delivery = await Delivery.findByPk(req.params.id, {
      include: [
        {
          model: Order,
          include: [
            {
              model: User,
              as: 'Consumer',
              attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber']
            }
          ]
        },
        {
          model: User,
          as: 'Driver',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber']
        }
      ]
    });
    
    if (!delivery) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Delivery not found'
      });
    }
    
    // Check authorization
    const isAuthorized = req.user.role === 'admin' || 
                        (req.user.role === 'driver' && delivery.driverId === req.user.userId) ||
                        (req.user.role === 'consumer' && delivery.Order.userId === req.user.userId);
    
    if (!isAuthorized) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view this delivery'
      });
    }
    
    return res.status(200).json({ delivery });
  } catch (error) {
    logger.error(`Error fetching delivery: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve delivery'
    });
  }
});

/**
 * @route POST /api/deliveries
 * @description Create a new delivery (automatically created when order is placed)
 * @access Private (admin only - typically called from order creation)
 */
router.post('/', [
  authenticate,
  requireActiveUser,
  requirePermissions(['admin']),
  body('orderId').isUUID().withMessage('Valid order ID is required'),
  body('scheduledPickupTime').optional().isISO8601().withMessage('Invalid scheduled pickup time format'),
  body('scheduledDeliveryTime').optional().isISO8601().withMessage('Invalid scheduled delivery time format'),
  body('deliveryAddress').trim().notEmpty().withMessage('Delivery address is required'),
  body('deliveryCity').trim().notEmpty().withMessage('Delivery city is required'),
  body('deliveryState').trim().notEmpty().withMessage('Delivery state is required'),
  body('deliveryZipCode').trim().notEmpty().withMessage('Delivery ZIP code is required'),
  body('deliveryInstructions').optional().trim(),
  body('driverId').optional().isUUID().withMessage('Invalid driver ID'),
  body('status').optional().isIn(['pending', 'assigned', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid status')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if order exists
    const order = await Order.findByPk(req.body.orderId);
    
    if (!order) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Order not found'
      });
    }
    
    // Check if delivery already exists for this order
    const existingDelivery = await Delivery.findOne({
      where: { orderId: req.body.orderId }
    });
    
    if (existingDelivery) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A delivery already exists for this order'
      });
    }
    
    // Set default status if not provided
    if (!req.body.status) {
      req.body.status = req.body.driverId ? 'assigned' : 'pending';
    }
    
    // Create delivery
    const delivery = await Delivery.create(req.body);
    
    logger.info(`New delivery created for order: ${order.orderNumber}`);
    
    return res.status(201).json({
      message: 'Delivery created successfully',
      delivery
    });
  } catch (error) {
    logger.error(`Error creating delivery: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create delivery'
    });
  }
});

/**
 * @route PUT /api/deliveries/:id
 * @description Update delivery details
 * @access Private (admin or assigned driver)
 */
router.put('/:id', [
  authenticate,
  requireActiveUser,
  requirePermissions(['update']),
  param('id').isUUID().withMessage('Invalid delivery ID'),
  body('scheduledPickupTime').optional().isISO8601().withMessage('Invalid scheduled pickup time format'),
  body('scheduledDeliveryTime').optional().isISO8601().withMessage('Invalid scheduled delivery time format'),
  body('actualPickupTime').optional().isISO8601().withMessage('Invalid actual pickup time format'),
  body('actualDeliveryTime').optional().isISO8601().withMessage('Invalid actual delivery time format'),
  body('deliveryAddress').optional().trim(),
  body('deliveryCity').optional().trim(),
  body('deliveryState').optional().trim(),
  body('deliveryZipCode').optional().trim(),
  body('deliveryInstructions').optional().trim(),
  body('driverId').optional().isUUID().withMessage('Invalid driver ID'),
  body('status').optional().isIn(['pending', 'assigned', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid status'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get delivery
    const delivery = await Delivery.findByPk(req.params.id);
    
    if (!delivery) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Delivery not found'
      });
    }
    
    // Check authorization
    const isAuthorized = req.user.role === 'admin' || 
                        (req.user.role === 'driver' && 
                         delivery.driverId === req.user.userId && 
                         req.user.permissions.includes('update_delivery'));
    
    if (!isAuthorized) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update this delivery'
      });
    }
    
    // If user is a driver, they can only update certain fields
    if (req.user.role === 'driver') {
      const allowedDriverFields = [
        'status', 
        'actualPickupTime', 
        'actualDeliveryTime', 
        'notes'
      ];
      
      // Remove fields that drivers shouldn't be able to update
      Object.keys(req.body).forEach(field => {
        if (!allowedDriverFields.includes(field)) {
          delete req.body[field];
        }
      });
      
      // Drivers can only update to certain statuses
      if (req.body.status) {
        const allowedStatusTransitions = {
          'assigned': ['in_progress'],
          'in_progress': ['completed', 'cancelled']
        };
        
        if (
          !allowedStatusTransitions[delivery.status] || 
          !allowedStatusTransitions[delivery.status].includes(req.body.status)
        ) {
          return res.status(400).json({
            error: 'Bad Request',
            message: `Cannot transition from ${delivery.status} to ${req.body.status}`
          });
        }
      }
    }
    
    // Update delivery
    await delivery.update(req.body);
    
    logger.info(`Delivery updated: ${delivery.id}`);
    
    return res.status(200).json({
      message: 'Delivery updated successfully',
      delivery
    });
  } catch (error) {
    logger.error(`Error updating delivery: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update delivery'
    });
  }
});

/**
 * @route PUT /api/deliveries/:id/assign
 * @description Assign a driver to a delivery
 * @access Private (admin only)
 */
router.put('/:id/assign', [
  authenticate,
  requireActiveUser,
  requirePermissions(['admin']),
  param('id').isUUID().withMessage('Invalid delivery ID'),
  body('driverId').isUUID().withMessage('Valid driver ID is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get delivery
    const delivery = await Delivery.findByPk(req.params.id);
    
    if (!delivery) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Delivery not found'
      });
    }
    
    // Check if driver exists and has driver role
    const driver = await User.findOne({
      where: {
        id: req.body.driverId,
        role: 'driver',
        status: 'active'
      }
    });
    
    if (!driver) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Driver not found or not active'
      });
    }
    
    // Update delivery with driver and change status
    await delivery.update({
      driverId: req.body.driverId,
      status: 'assigned'
    });
    
    logger.info(`Delivery ${delivery.id} assigned to driver ${driver.id}`);
    
    return res.status(200).json({
      message: 'Driver assigned successfully',
      delivery
    });
  } catch (error) {
    logger.error(`Error assigning driver: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to assign driver'
    });
  }
});

/**
 * @route GET /api/deliveries/driver/available
 * @description Get available deliveries for drivers to claim
 * @access Private (drivers only)
 */
router.get('/driver/available', [
  authenticate,
  requireActiveUser,
  requirePermissions(['update_delivery'])
], async (req, res) => {
  try {
    // Ensure user is a driver
    if (req.user.role !== 'driver') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only drivers can view available deliveries'
      });
    }

    // Get pending deliveries
    const deliveries = await Delivery.findAll({
      where: {
        status: 'pending',
        driverId: null
      },
      include: [
        {
          model: Order,
          attributes: ['id', 'orderNumber', 'totalAmount', 'createdAt']
        }
      ],
      order: [['createdAt', 'ASC']]
    });
    
    return res.status(200).json({ deliveries });
  } catch (error) {
    logger.error(`Error fetching available deliveries: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve available deliveries'
    });
  }
});

/**
 * @route PUT /api/deliveries/:id/claim
 * @description Claim a delivery (for drivers)
 * @access Private (drivers only)
 */
router.put('/:id/claim', [
  authenticate,
  requireActiveUser,
  requirePermissions(['update_delivery']),
  param('id').isUUID().withMessage('Invalid delivery ID')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Ensure user is a driver
    if (req.user.role !== 'driver') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only drivers can claim deliveries'
      });
    }

    // Get delivery
    const delivery = await Delivery.findByPk(req.params.id);
    
    if (!delivery) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Delivery not found'
      });
    }
    
    // Check if delivery is available to claim
    if (delivery.status !== 'pending' || delivery.driverId) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'This delivery is not available for claiming'
      });
    }
    
    // Update delivery with driver and change status
    await delivery.update({
      driverId: req.user.userId,
      status: 'assigned'
    });
    
    logger.info(`Delivery ${delivery.id} claimed by driver ${req.user.userId}`);
    
    return res.status(200).json({
      message: 'Delivery claimed successfully',
      delivery
    });
  } catch (error) {
    logger.error(`Error claiming delivery: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to claim delivery'
    });
  }
});

/**
 * @route GET /api/deliveries/consumer/:userId
 * @description Get deliveries for a specific consumer
 * @access Private (admin or the consumer themselves)
 */
router.get('/consumer/:userId', [
  authenticate,
  requireActiveUser,
  requirePermissions(['read']),
  param('userId').isUUID().withMessage('Invalid user ID')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check authorization
    const isAuthorized = req.user.role === 'admin' || req.user.userId === req.params.userId;
    
    if (!isAuthorized) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view these deliveries'
      });
    }
    
    // Get deliveries for consumer
    const deliveries = await Delivery.findAll({
      include: [
        {
          model: Order,
          where: { userId: req.params.userId },
          attributes: ['id', 'orderNumber', 'totalAmount', 'createdAt']
        },
        {
          model: User,
          as: 'Driver',
          attributes: ['id', 'firstName', 'lastName', 'phoneNumber']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    return res.status(200).json({ deliveries });
  } catch (error) {
    logger.error(`Error fetching consumer deliveries: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve deliveries'
    });
  }
});

module.exports = router;
