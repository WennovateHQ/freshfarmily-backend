/**
 * Dashboard Routes
 * 
 * Provides endpoints for admin, farmer, and customer dashboards
 */

const express = require('express');
const router = express.Router();
const { Farm } = require('../models/farm');
const { Product } = require('../models/product');
const { Order, OrderItem } = require('../models/order');
const { User } = require('../models/user');
const { Sequelize, Op } = require('sequelize');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const analyticsService = require('../services/analyticsService');
const { check, query, validationResult } = require('express-validator');
const { authenticate, requireActiveUser, checkRole } = require('../middleware/auth');
const validator = require('validator');
const dashboardLogger = require('../utils/logger');

/**
 * Helper function to get start date based on period
 * @param {string} period - The period for which to calculate start date ('today', 'week', 'month', 'year', 'all')
 * @param {Date} endDate - The reference end date (usually today)
 * @returns {Date} - Calculated start date
 */
function getStartDateByPeriod(period, endDate = new Date()) {
  const startDate = new Date(endDate);
  
  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case 'all':
      startDate = new Date(0); // Beginning of time
      break;
  }
  
  return startDate;
}

/**
 * @swagger
 * /api/dashboard/admin:
 *   get:
 *     summary: Get admin dashboard data
 *     description: Retrieves global statistics for administrators
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year, all]
 *         default: month
 *         description: Time period for statistics
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/admin', authenticate, async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Only admin users can access this endpoint
    if (req.user.role !== 'admin') {
      logger.warn(`Unauthorized access attempt to admin dashboard by ${req.user.email} (${req.user.role})`);
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to access the admin dashboard'
      });
    }

    logger.info(`Admin dashboard accessed by user: ${req.user.userId}`);

    // Calculate date range based on period
    const period = req.query.period || 'month';
    const endDate = new Date();
    let startDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
    }

    // Get global order statistics
    const orderStats = await analyticsService.getGlobalOrderStats(startDate, endDate);

    // Get user growth data
    const userGrowth = await sequelize.query(`
      SELECT 
        DATE_TRUNC('month', "users"."createdAt") as month,
        COUNT("users".id) as new_users
      FROM "users"
      WHERE "users"."createdAt" >= :startDate AND "users"."createdAt" <= :endDate
      GROUP BY DATE_TRUNC('month', "users"."createdAt")
      ORDER BY month ASC
    `, {
      replacements: { startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });

    // Get system health metrics
    const systemHealth = {
      databaseConnection: "healthy",
      apiLatency: "normal",
      storageUsage: "normal",
      lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000) // Mock data - 24 hours ago
    };

    // Get recent system activity
    const recentActivity = await sequelize.query(`
      (SELECT 'user_registered' as activity_type, "users"."createdAt" as timestamp, "users".id as reference_id
       FROM "users" 
       WHERE "users"."createdAt" >= :startDate 
       ORDER BY "users"."createdAt" DESC 
       LIMIT 5)
      UNION ALL
      (SELECT 'order_placed' as activity_type, "orders"."createdAt" as timestamp, "orders".id as reference_id
       FROM "orders" 
       WHERE "orders"."createdAt" >= :startDate 
       ORDER BY "orders"."createdAt" DESC 
       LIMIT 5)
      UNION ALL
      (SELECT 'farm_registered' as activity_type, "farms"."createdAt" as timestamp, "farms".id as reference_id
       FROM "farms" 
       WHERE "farms"."createdAt" >= :startDate 
       ORDER BY "farms"."createdAt" DESC 
       LIMIT 5)
      ORDER BY timestamp DESC
      LIMIT 10
    `, {
      replacements: { startDate },
      type: sequelize.QueryTypes.SELECT
    });

    res.status(200).json({
      success: true,
      data: {
        orderStats,
        userGrowth,
        systemHealth,
        recentActivity,
        period
      }
    });
  } catch (error) {
    logger.error(`Error getting admin dashboard: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard data',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/dashboard/farmer/{userId}:
 *   get:
 *     summary: Get farmer dashboard data
 *     description: Retrieves statistics for a specific farmer by userId
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user/farmer
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year, all]
 *         default: month
 *         description: Time period for statistics
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/farmer/:userId', authenticate, async (req, res) => {
  try {
    // Input validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get the user ID from the params
    const { userId } = req.params;
    const period = req.query.period || 'month';

    // Skip strict UUID validation but ensure we have a user ID
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        error: 'Bad Request', 
        message: 'User ID is required' 
      });
    }

    // Check authorization - allow the user to view their own dashboard
    const isAuthorized = req.user && (req.user.userId === userId || req.user.role === 'admin');
    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden', 
        message: 'You do not have permission to access this dashboard.' 
      });
    }

    // Find the farms associated with this user
    const farms = await Farm.findAll({
      where: { farmerId: userId }
    });

    // If no farms are found, return appropriate response
    if (!farms || farms.length === 0) {
      // Return 200 with empty dashboard data instead of 404
      // This allows the frontend to show an empty dashboard with proper messaging
      return res.status(200).json({
        success: true,
        farms: [],
        message: 'No farms found for this user.',
        stats: {
          orders: {
            total: 0,
            pending: 0,
            completed: 0,
            cancelled: 0
          },
          revenue: {
            total: 0,
            today: 0,
            thisWeek: 0,
            thisMonth: 0
          },
          customers: 0,
          products: 0
        },
        inventoryHealth: {
          lowStock: 0,
          outOfStock: 0,
          inStock: 0,
          totalProducts: 0
        },
        topSellingProducts: [],
        recentOrders: []
      });
    }

    // Use the first farm for dashboard stats
    const farmId = farms[0].id;
    const farmName = farms[0].name;

    // Calculate date ranges for the requested period
    const today = new Date();
    const startDate = getStartDateByPeriod(period, today);

    // Get orders stats
    const orderStats = await analyticsService.getFarmOrderStats(farmId, startDate, today);

    // Get inventory status
    const inventory = await Product.findAll({
      attributes: [
        ['id', 'productId'],  // Explicitly alias to avoid ambiguity
        'name',
        'category',
        'price',
        'quantityAvailable',
        'unit',
        'isAvailable',
        'status'
      ],
      where: {
        farmId: farmId,
        status: 'active'
      }
    });

    const inventoryHealth = {
      lowStock: inventory.filter(p => p.quantityAvailable > 0 && p.quantityAvailable <= 5).length,
      outOfStock: inventory.filter(p => p.quantityAvailable <= 0 || !p.isAvailable).length,
      inStock: inventory.filter(p => p.quantityAvailable > 5 && p.isAvailable).length,
      totalProducts: inventory.length
    };

    // Get top selling products
    const topSellingProducts = await OrderItem.findAll({
      attributes: [
        ['productId', 'productId'],  // Use direct column name to avoid ambiguity
        [Sequelize.fn('SUM', Sequelize.col('OrderItem.quantity')), 'totalSold'],
        [Sequelize.fn('SUM', Sequelize.literal('"OrderItem"."quantity" * "OrderItem"."unitPrice"')), 'totalRevenue']
      ],
      include: [{
        model: Product,
        as: 'OrderProduct',
        attributes: ['name', 'category', 'unit', 'price'],
        where: {
          farmId: farmId
        },
        required: true
      }, {
        model: Order,
        attributes: [],
        where: {
          createdAt: { [Op.between]: [startDate, today] }
        },
        required: true
      }],
      group: ['OrderItem.productId', 'OrderProduct.id', 'OrderProduct.name', 'OrderProduct.category', 'OrderProduct.unit', 'OrderProduct.price'],
      order: [[Sequelize.fn('SUM', Sequelize.col('OrderItem.quantity')), 'DESC']], // Use the same function as in attributes instead of literal
      limit: 5
    });

    // Get recent orders
    const recentOrders = await OrderItem.findAll({
      attributes: [
        [Sequelize.col('Order.id'), 'orderId'],
        'quantity',
        'unitPrice',
        [Sequelize.literal('"OrderItem"."quantity" * "OrderItem"."unitPrice"'), 'totalPrice']
      ],
      include: [{
        model: Product,
        as: 'OrderProduct',
        attributes: ['name', 'id'],
        where: {
          farmId: farmId
        },
        required: true
      }, {
        model: Order,
        attributes: ['id', 'orderNumber', 'status', 'createdAt', 'userId'],
        include: [{
          model: User,
          as: 'Customer',
          attributes: ['firstName', 'lastName']
        }]
      }],
      order: [[Sequelize.col('Order.createdAt'), 'DESC']],
      limit: 10
    });

    res.status(200).json({
      success: true,
      farmId,
      farmName,
      data: {
        orderStats,
        inventoryHealth,
        topSellingProducts,
        recentOrders,
        period
      }
    });
  } catch (error) {
    logger.error(`Error getting farmer dashboard: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard data',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/dashboard/farm/{farmId}:
 *   get:
 *     summary: Get detailed analytics for a specific farm
 *     description: Retrieves detailed analytics for a specific farm, including revenue and order data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: farmId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the farm
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *         default: month
 *         description: Time period for analytics
 *     responses:
 *       200:
 *         description: Farm analytics retrieved successfully
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/farm/:farmId', [
  authenticate, 
  requireActiveUser,
  query('period').optional().isIn(['week', 'month', 'year']).withMessage('Invalid period')
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { farmId } = req.params;
    const period = req.query.period || 'month';
    
    // Verify farm exists and user has permission
    const farm = await Farm.findByPk(farmId);
    if (!farm) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Farm not found'
      });
    }
    
    // Check if user is authorized (farm owner or admin)
    if (farm.farmerId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view analytics for this farm'
      });
    }
    
    // Calculate date ranges
    const endDate = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'year':
        startDate = new Date(endDate);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'month':
      default:
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }
    
    // Get farm order and revenue stats
    const { totalOrders, totalRevenue, ordersByStatus } = await analyticsService.getFarmOrderStats(farmId, startDate, endDate);
    
    // Get daily revenue data
    const dailyRevenue = await sequelize.query(`
      SELECT 
        DATE_TRUNC('day', o."createdAt")::date as date,
        SUM(oi.quantity * oi."unitPrice") as amount
      FROM "order_items" oi
      JOIN "orders" o ON oi."orderId" = o.id
      JOIN "products" p ON oi."productId" = p.id
      WHERE p."farmId" = :farmId
        AND o."createdAt" >= :startDate
        AND o."createdAt" <= :endDate
        AND o.status NOT IN ('cancelled')
      GROUP BY DATE_TRUNC('day', o."createdAt")::date
      ORDER BY date ASC
    `, {
      replacements: { farmId, startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });
    
    // Get weekly revenue data
    const weeklyRevenue = await sequelize.query(`
      SELECT 
        DATE_TRUNC('week', o."createdAt")::date as week,
        SUM(oi.quantity * oi."unitPrice") as amount
      FROM "order_items" oi
      JOIN "orders" o ON oi."orderId" = o.id
      JOIN "products" p ON oi."productId" = p.id
      WHERE p."farmId" = :farmId
        AND o."createdAt" >= :startDate
        AND o."createdAt" <= :endDate
        AND o.status NOT IN ('cancelled')
      GROUP BY DATE_TRUNC('week', o."createdAt")::date
      ORDER BY week ASC
    `, {
      replacements: { farmId, startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });
    
    // Get monthly revenue data
    const monthlyRevenue = await sequelize.query(`
      SELECT 
        DATE_TRUNC('month', o."createdAt")::date as month,
        SUM(oi.quantity * oi."unitPrice") as amount
      FROM "order_items" oi
      JOIN "orders" o ON oi."orderId" = o.id
      JOIN "products" p ON oi."productId" = p.id
      WHERE p."farmId" = :farmId
        AND o."createdAt" >= :yearAgo
        AND o."createdAt" <= :endDate
        AND o.status NOT IN ('cancelled')
      GROUP BY DATE_TRUNC('month', o."createdAt")::date
      ORDER BY month ASC
    `, {
      replacements: { 
        farmId, 
        yearAgo: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
        endDate 
      },
      type: sequelize.QueryTypes.SELECT
    });
    
    // Get unique customer count
    const customerCount = await sequelize.query(`
      SELECT COUNT(DISTINCT u.id) as customer_count
      FROM users u
      JOIN orders o ON u.id = o."userId"
      JOIN order_items oi ON o.id = oi."orderId"
      JOIN products p ON oi."productId" = p.id
      WHERE p."farmId" = :farmId
        AND o."createdAt" >= :startDate
        AND o."createdAt" <= :endDate
    `, {
      replacements: { farmId, startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });
    
    // Get top selling products
    const topProducts = await sequelize.query(`
      SELECT 
        p.id as "productId",
        p.name,
        SUM(oi.quantity) as "totalQuantity",
        SUM(oi.quantity * oi."unitPrice") as "totalRevenue"
      FROM "order_items" oi
      JOIN "orders" o ON oi."orderId" = o.id
      JOIN "products" p ON oi."productId" = p.id
      WHERE p."farmId" = :farmId
        AND o."createdAt" >= :startDate
        AND o."createdAt" <= :endDate
        AND o.status NOT IN ('cancelled')
      GROUP BY p.id, p.name
      ORDER BY "totalQuantity" DESC
      LIMIT 5
    `, {
      replacements: { farmId, startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });
    
    // Format the response
    const analyticsData = {
      revenue: {
        total: parseFloat(totalRevenue) || 0,
        daily: dailyRevenue.map(day => ({
          date: day.date,
          amount: parseFloat(day.amount) || 0
        })),
        weekly: weeklyRevenue.map(week => ({
          week: week.week,
          amount: parseFloat(week.amount) || 0
        })),
        monthly: monthlyRevenue.map(month => ({
          month: month.month,
          amount: parseFloat(month.amount) || 0
        }))
      },
      totalOrders: parseInt(ordersByStatus.total) || 0,
      ordersByStatus: {
        pending: parseInt(ordersByStatus.pending) || 0,
        confirmed: parseInt(ordersByStatus.confirmed) || 0,
        processing: parseInt(ordersByStatus.processing) || 0,
        ready: parseInt(ordersByStatus.ready) || 0,
        out_for_delivery: parseInt(ordersByStatus.out_for_delivery) || 0,
        delivered: parseInt(ordersByStatus.delivered) || 0,
        picked_up: parseInt(ordersByStatus.picked_up) || 0,
        cancelled: parseInt(ordersByStatus.cancelled) || 0
      },
      customers: parseInt(customerCount[0].customer_count) || 0,
      topProducts: topProducts.map(product => ({
        productId: product.productId,
        name: product.name,
        totalQuantity: parseInt(product.totalQuantity) || 0,
        totalRevenue: parseFloat(product.totalRevenue) || 0
      }))
    };
    
    return res.status(200).json({
      success: true,
      data: analyticsData,
      period
    });
    
  } catch (error) {
    logger.error(`Error getting farm analytics: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: `Failed to retrieve farm analytics: ${error.message}`
    });
  }
});

/**
 * @swagger
 * /api/dashboard/consumer/{userId}:
 *   get:
 *     summary: Get consumer dashboard data
 *     description: Retrieves statistics for a specific consumer
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [month, year, all]
 *         default: all
 *         description: Time period for statistics
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/consumer/:userId', authenticate, async (req, res) => {
  try {
    const logger = dashboardLogger;
    const { userId } = req.params;
    
    // Validate userId
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    
    // Users can only view their own dashboard unless they are admins
    if (userId !== req.user.userId && req.user.role !== 'admin') {
      logger.warn(`Unauthorized access attempt to consumer dashboard for user ${userId} by user ${req.user.userId} (${req.user.role})`);
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view this user\'s dashboard'
      });
    }
    
    logger.info(`Consumer dashboard for user ${userId} accessed by ${req.user.email}`);

    // Calculate date range based on period
    const period = req.query.period || 'all';
    const endDate = new Date();
    let startDate = new Date();

    switch (period) {
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'all':
      default:
        startDate = new Date(0); // Beginning of time
        break;
    }
    
    // Get user order statistics
    const orderStats = await analyticsService.getUserOrderStats(userId, startDate, endDate);

    // Get recent orders
    const recentOrders = await Order.findAll({
      where: {
        userId: userId,
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [
        {
          model: OrderItem,
          as: 'Items',
          include: [
            {
              model: Product,
              attributes: ['id', 'name', 'farmId'],
              include: [
                {
                  model: Farm,
                  as: 'Farm',
                  attributes: ['id', 'name']
                }
              ]
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    // Get upcoming deliveries
    const upcomingDeliveries = await Order.findAll({
      attributes: [
        ['id', 'orderId'],  // Explicitly alias to avoid ambiguity
        'orderNumber',
        'status',
        'scheduledDeliveryTime',
        'deliveryAddress',
        'deliveryCity',
        'deliveryState',
        'deliveryZipCode'
      ],
      where: {
        userId: userId,
        status: ['confirmed', 'processing', 'ready', 'out_for_delivery'],
        deliveryMethod: 'delivery'
      },
      order: [
        ['scheduledDeliveryTime', 'ASC']
      ],
      limit: 3
    });

    res.status(200).json({
      success: true,
      data: {
        userId: req.params.userId,
        orderStats,
        recentOrders,
        upcomingDeliveries,
        period
      }
    });
  } catch (error) {
    logger.error(`Error getting consumer dashboard: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard data',
      message: error.message
    });
  }
});

/**
 * @route GET /api/dashboard/health
 * @description Health check endpoint for dashboard API
 * @access Public
 */
router.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'healthy',
    message: 'Dashboard API is working properly',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
