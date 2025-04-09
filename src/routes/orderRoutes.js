/**
 * Order Routes
 * 
 * Defines the order management API routes for the FreshFarmily system
 */

const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { authenticate, requireActiveUser, requirePermissions } = require('../middleware/auth');
const logger = require('../utils/logger');
const { Order, OrderItem, PaymentInfo } = require('../models/order');
const { Product } = require('../models/product');
const { User } = require('../models/user');
const { Delivery } = require('../models/delivery');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const stripeService = require('../services/stripeService');

const router = express.Router();

/**
 * @route GET /api/orders
 * @description Get all orders with pagination and filtering (admin, or personal orders for users)
 * @access Private
 */
router.get('/', [
  authenticate,
  requireActiveUser,
  requirePermissions(['read']),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status'),
  query('farmId').optional().isUUID().withMessage('Invalid farm ID'),
  query('userId').optional().isUUID().withMessage('Invalid user ID'),
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
          model: User,
          as: 'Consumer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Delivery,
          as: 'Delivery',
          required: false
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
    
    if (req.query.startDate && req.query.endDate) {
      queryOptions.where.createdAt = {
        [sequelize.Op.between]: [
          new Date(req.query.startDate),
          new Date(req.query.endDate)
        ]
      };
    } else if (req.query.startDate) {
      queryOptions.where.createdAt = {
        [sequelize.Op.gte]: new Date(req.query.startDate)
      };
    } else if (req.query.endDate) {
      queryOptions.where.createdAt = {
        [sequelize.Op.lte]: new Date(req.query.endDate)
      };
    }
    
    // If not admin, users can only see their own orders
    if (req.user.role !== 'admin') {
      queryOptions.where.userId = req.user.userId;
    } else {
      // Admin can filter by user
      if (req.query.userId) {
        queryOptions.where.userId = req.query.userId;
      }
    }
    
    // Filter by farm (need to join through order items)
    if (req.query.farmId) {
      queryOptions.include.push({
        model: OrderItem,
        as: 'Items',
        required: true,
        include: [
          {
            model: Product,
            required: true,
            where: { farmId: req.query.farmId }
          }
        ]
      });
    } else {
      // Always include order items but don't make them required for filtering
      queryOptions.include.push({
        model: OrderItem,
        as: 'Items',
        required: false
      });
    }
    
    // Execute query
    const { count, rows: orders } = await Order.findAndCountAll(queryOptions);
    
    return res.status(200).json({
      orders,
      totalCount: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    logger.error(`Error fetching orders: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve orders'
    });
  }
});

/**
 * @route GET /api/orders/:id
 * @description Get order by ID with details
 * @access Private (admin or order owner)
 */
router.get('/:id', [
  authenticate,
  requireActiveUser,
  requirePermissions(['read']),
  param('id').isUUID().withMessage('Invalid order ID')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get order with details
    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'Consumer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber']
        },
        {
          model: OrderItem,
          as: 'Items',
          include: [
            {
              model: Product,
              include: [
                { association: 'Farm' }
              ]
            }
          ]
        },
        {
          model: PaymentInfo,
          as: 'Payment'
        },
        {
          model: Delivery,
          as: 'Delivery',
          include: [
            {
              model: User,
              as: 'Driver',
              attributes: ['id', 'firstName', 'lastName', 'phoneNumber']
            }
          ]
        }
      ]
    });
    
    if (!order) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Order not found'
      });
    }
    
    // Check authorization
    const isAuthorized = req.user.role === 'admin' || order.userId === req.user.userId;
    
    if (!isAuthorized) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view this order'
      });
    }
    
    return res.status(200).json({ order });
  } catch (error) {
    logger.error(`Error fetching order: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve order'
    });
  }
});

/**
 * @route GET /api/orders/farm/:farmId
 * @description Get all orders for a specific farm with pagination
 * @access Private (farmer or admin)
 */
router.get('/farm/:farmId', [
  authenticate,
  requireActiveUser,
  requirePermissions(['read']),
  param('farmId').isUUID().withMessage('Invalid farm ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'confirmed', 'processing', 'ready', 'out_for_delivery', 'delivered', 'picked_up', 'cancelled']).withMessage('Invalid status')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { farmId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Check if user is authorized to view these orders
    // Only farm owner or admin can view
    const isFarmOwner = await sequelize.query(
      `SELECT COUNT(*) as count FROM farms WHERE id = :farmId AND "farmerId" = :userId`,
      {
        replacements: { farmId, userId: req.user.userId },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    if (isFarmOwner[0].count === 0 && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view orders for this farm'
      });
    }
    
    // Get orders that contain products from this farm
    const orderData = await sequelize.query(
      `SELECT DISTINCT 
        o.id, 
        o."orderNumber", 
        o.status, 
        o."totalAmount" as total,
        o."createdAt" as date,
        u.id as "userId",
        u."firstName",
        u."lastName",
        u.email
      FROM orders o
      JOIN "order_items" oi ON o.id = oi."orderId"
      JOIN products p ON oi."productId" = p.id
      JOIN users u ON o."userId" = u.id
      WHERE p."farmId" = :farmId
      ORDER BY o."createdAt" DESC
      LIMIT :limit OFFSET :offset`,
      {
        replacements: { farmId, limit, offset },
        type: sequelize.QueryTypes.SELECT
      }
    );

    // Get total count for pagination
    const countResult = await sequelize.query(
      `SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      JOIN "order_items" oi ON o.id = oi."orderId"
      JOIN products p ON oi."productId" = p.id
      WHERE p."farmId" = :farmId`,
      {
        replacements: { farmId },
        type: sequelize.QueryTypes.SELECT
      }
    );

    // Format the customer data and order items for each order
    const formattedOrders = orderData.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: parseFloat(order.total),
      date: order.date,
      customer: {
        id: order.userId,
        name: `${order.firstName} ${order.lastName}`,
        email: order.email
      }
    }));

    // Get items for each order (in a separate query to avoid duplication)
    for (const order of formattedOrders) {
      const items = await sequelize.query(
        `SELECT 
          oi.id,
          oi.quantity,
          oi."unitPrice",
          oi.quantity * oi."unitPrice" as subtotal,
          p.name,
          p.id as "productId",
          p.unit
        FROM "order_items" oi
        JOIN products p ON oi."productId" = p.id
        WHERE oi."orderId" = :orderId AND p."farmId" = :farmId`,
        {
          replacements: { orderId: order.id, farmId },
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      order.items = items.map(item => ({
        id: item.id,
        productId: item.productId,
        name: item.name,
        quantity: parseInt(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        subtotal: parseFloat(item.subtotal),
        unit: item.unit
      }));
    }

    return res.status(200).json({
      orders: formattedOrders,
      totalCount: parseInt(countResult[0].total),
      totalPages: Math.ceil(parseInt(countResult[0].total) / limit),
      currentPage: page
    });
  } catch (error) {
    logger.error(`Error fetching orders for farm ${req.params.farmId}: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: `Failed to retrieve orders for farm: ${error.message}`
    });
  }
});

/**
 * @route POST /api/orders
 * @description Create a new order
 * @access Private (consumers only)
 */
router.post('/', [
  authenticate,
  requireActiveUser,
  requirePermissions(['create_order']),
  body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  body('items.*.productId').isUUID().withMessage('Valid product ID is required'),
  body('items.*.quantity').isFloat({ min: 0.1 }).withMessage('Quantity must be greater than 0'),
  body('delivery').optional().isObject().withMessage('Delivery must be an object'),
  body('delivery.deliveryAddress').optional().trim().notEmpty().withMessage('Delivery address is required'),
  body('delivery.deliveryCity').optional().trim().notEmpty().withMessage('Delivery city is required'),
  body('delivery.deliveryState').optional().trim().notEmpty().withMessage('Delivery state is required'),
  body('delivery.deliveryZipCode').optional().trim().notEmpty().withMessage('Delivery ZIP code is required'),
  body('delivery.deliveryMethod').optional().isIn(['pickup', 'delivery']).withMessage('Invalid delivery method'),
  body('delivery.scheduledDeliveryTime').optional().isISO8601().withMessage('Invalid scheduled delivery time format'),
  body('delivery.deliveryInstructions').optional().trim(),
  body('payment').optional().isObject().withMessage('Payment info is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Start a transaction to ensure data consistency
    const result = await sequelize.transaction(async (t) => {
      // Verify all products exist and are available
      const productIds = req.body.items.map(item => item.productId);
      const products = await Product.findAll({
        where: {
          id: productIds,
          isAvailable: true,
          status: 'active'
        },
        include: [{
          model: User,
          as: 'Farmer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      });
      
      // Check if all products were found
      if (products.length !== productIds.length) {
        const foundIds = products.map(p => p.id);
        const missingIds = productIds.filter(id => !foundIds.includes(id));
        
        throw new Error(`Some products are not available: ${missingIds.join(', ')}`);
      }
      
      // Calculate order total
      let subtotal = 0;
      const orderItems = [];
      let uniqueFarms = new Set();
      
      for (const item of req.body.items) {
        const product = products.find(p => p.id === item.productId);
        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;
        uniqueFarms.add(product.Farmer.id);
        
        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          pricePerUnit: product.price,
          totalPrice: itemTotal,
          farmerId: product.Farmer.id
        });
      }
      
      // Calculate taxes based on province
      const province = req.body.delivery?.deliveryState || 'ON'; // Default to Ontario if not specified
      const { totalTaxAmount } = stripeService.calculateTaxes(subtotal, province);
      
      // Add delivery fee
      const deliveryFee = req.body.delivery?.deliveryMethod === 'pickup' ? 0 : 5.99;
      
      // Apply free delivery from referral program if available
      let freeDeliveryApplied = false;
      if (deliveryFee > 0) {
        const referralInfo = await referralService.getUserReferralInfo(req.user.userId);
        if (referralInfo && referralInfo.freeDeliveriesRemaining > 0) {
          freeDeliveryApplied = true;
        }
      }
      
      const finalDeliveryFee = freeDeliveryApplied ? 0 : deliveryFee;
      
      // Calculate the total amount
      const totalAmount = subtotal + totalTaxAmount + finalDeliveryFee;
      
      // Generate a unique order number
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Create the order
      const order = await Order.create({
        userId: req.user.userId,
        orderNumber,
        subtotalAmount: subtotal,
        taxAmount: totalTaxAmount,
        deliveryFee: finalDeliveryFee,
        totalAmount,
        status: 'pending',
        paymentStatus: 'pending',
        freeDeliveryApplied
      }, { transaction: t });
      
      // Add order items
      for (const item of orderItems) {
        await OrderItem.create({
          ...item,
          orderId: order.id
        }, { transaction: t });
      }
      
      // Create placeholder payment info
      await PaymentInfo.create({
        orderId: order.id,
        paymentMethod: 'card',
        paymentStatus: 'pending',
        amount: totalAmount,
        currency: 'CAD'
      }, { transaction: t });
      
      // Add delivery info if provided
      if (req.body.delivery) {
        // Set default pickup time if not provided
        if (!req.body.delivery.scheduledDeliveryTime) {
          // Default to 2 days from now
          const deliveryDate = new Date();
          deliveryDate.setDate(deliveryDate.getDate() + 2);
          req.body.delivery.scheduledDeliveryTime = deliveryDate;
        }
        
        await Delivery.create({
          orderId: order.id,
          status: 'pending',
          deliveryMethod: req.body.delivery.deliveryMethod || 'delivery',
          scheduledDeliveryTime: req.body.delivery.scheduledDeliveryTime,
          deliveryAddress: req.body.delivery.deliveryAddress,
          deliveryCity: req.body.delivery.deliveryCity,
          deliveryState: req.body.delivery.deliveryState,
          deliveryZipCode: req.body.delivery.deliveryZipCode,
          deliveryInstructions: req.body.delivery.deliveryInstructions
        }, { transaction: t });
      }
      
      return order;
    });
    
    // Get the full order with associations
    const order = await Order.findByPk(result.id, {
      include: [
        { 
          model: OrderItem, 
          as: 'Items',
          include: ['Product']
        },
        { model: PaymentInfo, as: 'Payment' },
        { model: Delivery, as: 'Delivery' }
      ]
    });
    
    logger.info(`New order created: ${order.orderNumber} by user ${req.user.userId}`);
    
    return res.status(201).json({
      message: 'Order created successfully',
      order,
      paymentInstructions: 'Proceed to payment using the order ID and our payment endpoints'
    });
  } catch (error) {
    logger.error(`Error creating order: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to create order'
    });
  }
});

/**
 * @route PUT /api/orders/:id/status
 * @description Update order status
 * @access Private (admin only)
 */
router.put('/:id/status', [
  authenticate,
  requireActiveUser,
  requirePermissions(['admin']),
  param('id').isUUID().withMessage('Invalid order ID'),
  body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status'),
  body('paymentStatus').optional().isIn(['pending', 'paid', 'failed', 'refunded']).withMessage('Invalid payment status')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get order
    const order = await Order.findByPk(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Order not found'
      });
    }
    
    // Update order status
    const previousStatus = order.status;
    await order.update({
      status: req.body.status,
      paymentStatus: req.body.paymentStatus || order.paymentStatus
    });
    
    // If transitioning to cancelled, handle payment cancellation
    if (req.body.status === 'cancelled' && previousStatus !== 'cancelled') {
      // If payment was already processed, issue refund
      if (order.paymentStatus === 'paid' && order.paymentIntentId) {
        try {
          const refund = await stripeService.refundPayment(order.paymentIntentId);
          await order.update({ paymentStatus: 'refunded', refundId: refund.id });
          
          logger.info(`Refund processed for order ${order.id}: ${refund.id}`);
        } catch (refundError) {
          logger.error(`Failed to process refund for order ${order.id}: ${refundError.message}`);
        }
      }
    }
    
    // If transitioning to delivered, process referral rewards if applicable
    if (req.body.status === 'delivered' && previousStatus !== 'delivered') {
      try {
        // Process any pending referral rewards
        await referralService.processDeliveryReferralRewards(order.id, order.userId);
      } catch (referralError) {
        logger.error(`Failed to process referral rewards for order ${order.id}: ${referralError.message}`);
      }
    }
    
    logger.info(`Order ${order.id} status updated from ${previousStatus} to ${req.body.status}`);
    
    return res.status(200).json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    logger.error(`Error updating order status: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update order status'
    });
  }
});

/**
 * @route PUT /api/orders/:id/cancel
 * @description Cancel an order (consumer or admin)
 * @access Private
 */
router.put('/:id/cancel', [
  authenticate,
  requireActiveUser,
  requirePermissions(['read']), // Only need read permission for consumers to cancel their own orders
  param('id').isUUID().withMessage('Invalid order ID'),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get order
    const order = await Order.findByPk(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Order not found'
      });
    }
    
    // Check authorization
    const isAuthorized = req.user.role === 'admin' || 
                        (order.userId === req.user.userId && 
                         ['pending', 'processing'].includes(order.status));
    
    if (!isAuthorized) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to cancel this order or it is past the cancellation window'
      });
    }
    
    // Update order status to cancelled
    await order.update({ 
      status: 'cancelled',
      cancellationReason: req.body.reason || 'Cancelled by user'
    });
    
    // Update delivery status if exists
    const delivery = await Delivery.findOne({ where: { orderId: order.id } });
    if (delivery) {
      await delivery.update({ status: 'cancelled' });
    }
    
    logger.info(`Order cancelled: ${order.orderNumber}`);
    
    return res.status(200).json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    logger.error(`Error cancelling order: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to cancel order'
    });
  }
});

module.exports = router;
