/**
 * Payment Routes
 * 
 * Defines all payment-related API routes for the FreshFarmily system
 */

const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { authenticate, requireActiveUser, requirePermissions } = require('../middleware/auth');
const stripeService = require('../services/stripeService');
const logger = require('../utils/logger');
const { FarmerPayment, FarmerPayout } = require('../models/payment');
const { User } = require('../models/user');
const { Farm } = require('../models/farm');

const router = express.Router();

/**
 * @route POST /api/payments/process
 * @description Process payment for an order
 * @access Private
 */
router.post('/process', [
  authenticate,
  requireActiveUser,
  body('orderId').isUUID().withMessage('Invalid order ID'),
  body('paymentMethodId').notEmpty().withMessage('Payment method ID is required'),
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { orderId, paymentMethodId, email } = req.body;
    
    // Get order details
    const { Order, OrderItem } = require('../models/order');
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: OrderItem,
          as: 'Items',
          include: ['Product']
        }
      ]
    });
    
    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        message: 'The requested order could not be found'
      });
    }
    
    // Verify user owns this order
    if (order.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'You are not authorized to process payment for this order'
      });
    }
    
    // Process payment with Stripe
    const paymentIntent = await stripeService.createPaymentIntent(order, {
      paymentMethodId,
      email
    });
    
    // Update order payment status
    await order.update({
      paymentStatus: 'paid',
      paymentIntentId: paymentIntent.id
    });
    
    // Create payment info record
    const { PaymentInfo } = require('../models/payment');
    const paymentInfo = await PaymentInfo.create({
      orderId: order.id,
      paymentIntentId: paymentIntent.id,
      paymentMethod: 'card',
      paymentStatus: 'succeeded',
      amount: order.totalAmount,
      currency: 'CAD',
      cardLast4: paymentIntent.payment_method_details?.card?.last4,
      cardBrand: paymentIntent.payment_method_details?.card?.brand,
      receiptUrl: paymentIntent.charges?.data[0]?.receipt_url
    });
    
    // Process commission and farmer payments
    const orderItems = order.Items;
    const paymentProcessing = await stripeService.processOrderPayment(order, orderItems);
    
    // Apply referral free delivery if available
    const referralService = require('../services/referralService');
    const freeDeliveryResult = await referralService.applyFreeDeliveryIfAvailable(order, order.userId);
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        receipt_url: paymentIntent.charges?.data[0]?.receipt_url
      },
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: 'paid'
      },
      freeDeliveryApplied: freeDeliveryResult.applied
    });
  } catch (error) {
    logger.error(`Payment processing error: ${error.message}`);
    
    // Return appropriate error response
    let status = 500;
    let errorMessage = 'An error occurred while processing your payment';
    
    // Handle Stripe-specific errors
    if (error.type && error.type.startsWith('Stripe')) {
      status = 400;
      
      switch (error.code) {
        case 'card_declined':
          errorMessage = 'Your card was declined. Please try another payment method.';
          break;
        case 'expired_card':
          errorMessage = 'Your card has expired. Please try another card.';
          break;
        case 'incorrect_cvc':
          errorMessage = 'The CVC code was incorrect. Please try again.';
          break;
        case 'processing_error':
          errorMessage = 'An error occurred while processing your card. Please try again.';
          break;
        default:
          errorMessage = error.message || 'Payment processing failed. Please try again.';
      }
    }
    
    return res.status(status).json({
      error: 'Payment Failed',
      message: errorMessage,
      details: process.env.NODE_ENV === 'production' ? null : error.message
    });
  }
});

/**
 * @route GET /api/payments/farmer-payments
 * @description Get farmer payment history with pagination
 * @access Private (farmer or admin)
 */
router.get('/farmer-payments', [
  authenticate,
  requireActiveUser,
  requirePermissions(['read']),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('farmerId').optional().isUUID().withMessage('Invalid farmer ID'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
  query('isPaid').optional().isBoolean().withMessage('isPaid must be a boolean')
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
          as: 'Farmer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    };
    
    // Apply filters
    if (req.query.startDate && req.query.endDate) {
      queryOptions.where.createdAt = {
        [sequelize.Op.between]: [
          new Date(req.query.startDate),
          new Date(req.query.endDate)
        ]
      };
    }
    
    if (req.query.isPaid !== undefined) {
      queryOptions.where.isPaid = req.query.isPaid === 'true';
    }
    
    // Non-admin users can only see their own payments
    if (req.user.role !== 'admin') {
      queryOptions.where.farmerId = req.user.userId;
    } else if (req.query.farmerId) {
      // Admin can filter by farmer
      queryOptions.where.farmerId = req.query.farmerId;
    }
    
    // Execute query
    const { count, rows: payments } = await FarmerPayment.findAndCountAll(queryOptions);
    
    return res.status(200).json({
      payments,
      totalCount: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    logger.error(`Error fetching farmer payments: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve farmer payments'
    });
  }
});

/**
 * @route GET /api/payments/farmer-payouts
 * @description Get farmer payout history with pagination
 * @access Private (farmer or admin)
 */
router.get('/farmer-payouts', [
  authenticate,
  requireActiveUser,
  requirePermissions(['read']),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('farmerId').optional().isUUID().withMessage('Invalid farmer ID'),
  query('status').optional().isIn(['pending', 'processing', 'completed', 'failed']).withMessage('Invalid status'),
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
          as: 'Farmer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    };
    
    // Apply filters
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
    }
    
    // Non-admin users can only see their own payouts
    if (req.user.role !== 'admin') {
      queryOptions.where.farmerId = req.user.userId;
    } else if (req.query.farmerId) {
      // Admin can filter by farmer
      queryOptions.where.farmerId = req.query.farmerId;
    }
    
    // Execute query
    const { count, rows: payouts } = await FarmerPayout.findAndCountAll(queryOptions);
    
    return res.status(200).json({
      payouts,
      totalCount: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    logger.error(`Error fetching farmer payouts: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve farmer payouts'
    });
  }
});

/**
 * @route POST /api/payments/process-weekly-payouts
 * @description Process weekly payouts for all farmers (admin only)
 * @access Private (admin only)
 */
router.post('/process-weekly-payouts', [
  authenticate,
  requireActiveUser,
  requirePermissions(['admin'])
], async (req, res) => {
  try {
    // Process payouts
    const result = await stripeService.processWeeklyPayouts();
    
    return res.status(200).json({
      success: true,
      message: `Successfully processed ${result.payoutCount} farmer payouts`,
      payouts: result.payouts
    });
  } catch (error) {
    logger.error(`Error processing weekly payouts: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process weekly payouts'
    });
  }
});

/**
 * @route GET /api/payments/tax-rates/:province
 * @description Get tax rates for a specific province
 * @access Public
 */
router.get('/tax-rates/:province', [
  param('province').isLength({ min: 2, max: 2 }).withMessage('Province code must be 2 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const province = req.params.province.toUpperCase();
    const taxRates = stripeService.TAX_RATES[province];
    
    if (!taxRates) {
      return res.status(404).json({
        error: 'Province not found',
        message: 'Tax rates for the specified province could not be found'
      });
    }
    
    return res.status(200).json({
      province,
      gst: taxRates.gst,
      pst: taxRates.pst,
      totalRate: taxRates.gst + taxRates.pst
    });
  } catch (error) {
    logger.error(`Error fetching tax rates: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve tax rates'
    });
  }
});

/**
 * @route GET /api/payments/calculate-taxes
 * @description Calculate taxes for an amount in a specific province
 * @access Public
 */
router.get('/calculate-taxes', [
  query('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  query('province').isLength({ min: 2, max: 2 }).withMessage('Province code must be 2 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const amount = parseFloat(req.query.amount);
    const province = req.query.province.toUpperCase();
    
    const taxCalculation = stripeService.calculateTaxes(amount, province);
    
    return res.status(200).json({
      amount,
      province,
      ...taxCalculation,
      totalWithTax: parseFloat((amount + taxCalculation.totalTaxAmount).toFixed(2))
    });
  } catch (error) {
    logger.error(`Error calculating taxes: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to calculate taxes'
    });
  }
});

module.exports = router;
