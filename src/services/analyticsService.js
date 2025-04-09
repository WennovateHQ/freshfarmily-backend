/**
 * Analytics Service
 * 
 * Provides analytics and statistics calculations for FreshFarmily data
 */

const { sequelize } = require('../config/database');
const { Order, OrderItem } = require('../models/order');
const { Product } = require('../models/product');
const { Farm } = require('../models/farm');
const { User } = require('../models/user');
const { Delivery } = require('../models/delivery');
const { QueryTypes, Op, Sequelize } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Calculate order statistics for a user
 * @param {string} userId - User ID
 * @param {Date} startDate - Start date for the statistics period
 * @param {Date} endDate - End date for the statistics period
 * @returns {Object} Order statistics
 */
async function getUserOrderStats(userId, startDate, endDate) {
  try {
    // Validate inputs
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Format dates
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    // Get total orders count for the user
    const orderCount = await Order.count({
      where: {
        userId,
        createdAt: {
          [Op.between]: [start, end]
        }
      }
    });

    // Get total amount spent
    const totalSpent = await Order.sum('totalAmount', {
      where: {
        userId,
        status: {
          [Op.notIn]: ['cancelled', 'refunded']
        },
        paymentStatus: {
          [Op.notIn]: ['refunded']
        },
        createdAt: {
          [Op.between]: [start, end]
        }
      }
    });

    // Calculate average order value
    const averageOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

    // Get orders by status
    const ordersByStatus = await Order.findAll({
      attributes: [
        'status', 
        [sequelize.fn('COUNT', sequelize.col('status')), 'statusCount']
      ],
      where: {
        userId,
        createdAt: {
          [Op.between]: [start, end]
        }
      },
      group: ['status'],
      raw: true
    });

    // Convert to easily usable format
    const statusCounts = {};
    ordersByStatus.forEach(item => {
      statusCounts[item.status] = parseInt(item.statusCount);
    });

    // Get most frequently ordered products
    const topProducts = await OrderItem.findAll({
      attributes: [
        'productId',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity']
      ],
      include: [
        {
          model: Order,
          as: 'Order',
          attributes: [],
          where: {
            userId,
            createdAt: {
              [Op.between]: [start, end]
            }
          }
        },
        {
          model: Product,
          attributes: ['name', 'category']
        }
      ],
      group: ['OrderItem.productId', 'Product.id', 'Product.name', 'Product.category'],
      order: [[sequelize.fn('SUM', sequelize.col('quantity')), 'DESC']],
      limit: 5,
      raw: true
    });

    // Get most frequent farms
    const topFarms = await OrderItem.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('Product.farmId')), 'orderCount']
      ],
      include: [
        {
          model: Order,
          as: 'Order',
          attributes: [],
          where: {
            userId,
            createdAt: {
              [Op.between]: [start, end]
            }
          }
        },
        {
          model: Product,
          attributes: ['farmId'],
          include: [
            {
              model: Farm,
              as: 'Farm',
              attributes: ['name']
            }
          ]
        }
      ],
      group: ['Product.farmId', 'Product->Farm.id', 'Product->Farm.name'],
      order: [[sequelize.fn('COUNT', sequelize.col('Product.farmId')), 'DESC']],
      limit: 3,
      raw: true
    });

    return {
      totalOrders: orderCount,
      totalSpent: totalSpent || 0,
      averageOrderValue: averageOrderValue || 0,
      ordersByStatus: statusCounts,
      topProducts: topProducts.map(p => ({
        productId: p.productId,
        name: p['Product.name'],
        category: p['Product.category'],
        totalQuantity: parseFloat(p.totalQuantity)
      })),
      topFarms: topFarms.map(f => ({
        farmId: f['Product.farmId'],
        name: f['Product->Farm.name'],
        orderCount: parseInt(f.orderCount)
      }))
    };
  } catch (error) {
    logger.error(`Error calculating user order stats: ${error.message}`);
    throw error;
  }
}

/**
 * Calculate order statistics for a farm
 * @param {string} farmId - Farm ID
 * @param {Date} startDate - Start date for the statistics period
 * @param {Date} endDate - End date for the statistics period
 * @returns {Object} Farm order statistics
 */
async function getFarmOrderStats(farmId, startDate, endDate) {
  try {
    if (!farmId) {
      throw new Error('Farm ID is required');
    }

    // Format dates
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    // Get total orders and total revenue using raw query with proper table names
    const statistics = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(oi.quantity * oi."unitPrice"), 0) as total_revenue,
        COUNT(DISTINCT o."userId") as unique_customers
      FROM "order_items" oi
      JOIN "orders" o ON oi."orderId" = o.id
      JOIN "products" p ON oi."productId" = p.id
      WHERE p."farmId" = :farmId
        AND o."createdAt" BETWEEN :startDate AND :endDate
        AND o."paymentStatus" != 'refunded'
    `, {
      replacements: { farmId, startDate: start, endDate: end },
      type: sequelize.QueryTypes.SELECT
    });

    // Get order count by status
    const ordersByStatus = await sequelize.query(`
      SELECT 
        o.status,
        COUNT(DISTINCT o.id) as count
      FROM "order_items" oi
      JOIN "orders" o ON oi."orderId" = o.id
      JOIN "products" p ON oi."productId" = p.id
      WHERE p."farmId" = :farmId
        AND o."createdAt" BETWEEN :startDate AND :endDate
        AND o.status IN ('pending', 'confirmed', 'processing', 'ready', 'out_for_delivery', 'delivered', 'picked_up', 'cancelled')
      GROUP BY o.status
    `, {
      replacements: { farmId, startDate: start, endDate: end },
      type: sequelize.QueryTypes.SELECT
    });

    // Get daily revenue data for chart
    const dailyRevenue = await sequelize.query(`
      SELECT 
        DATE_TRUNC('day', o."createdAt") as day,
        COALESCE(SUM(oi.quantity * oi."unitPrice"), 0) as revenue
      FROM "order_items" oi
      JOIN "orders" o ON oi."orderId" = o.id
      JOIN "products" p ON oi."productId" = p.id
      WHERE p."farmId" = :farmId
        AND o."createdAt" BETWEEN :startDate AND :endDate
        AND o.status NOT IN ('cancelled')
        AND o."paymentStatus" NOT IN ('refunded')
      GROUP BY DATE_TRUNC('day', o."createdAt")
      ORDER BY day
    `, {
      replacements: { farmId, startDate: start, endDate: end },
      type: sequelize.QueryTypes.SELECT
    });

    // Get weekly revenue data
    const weeklyRevenue = await sequelize.query(`
      SELECT 
        DATE_TRUNC('week', o."createdAt") as week,
        COALESCE(SUM(oi.quantity * oi."unitPrice"), 0) as revenue
      FROM "order_items" oi
      JOIN "orders" o ON oi."orderId" = o.id
      JOIN "products" p ON oi."productId" = p.id
      WHERE p."farmId" = :farmId
        AND o."createdAt" BETWEEN :startDate AND :endDate
        AND o.status NOT IN ('cancelled')
        AND o."paymentStatus" NOT IN ('refunded')
      GROUP BY DATE_TRUNC('week', o."createdAt")
      ORDER BY week
    `, {
      replacements: { farmId, startDate: start, endDate: end },
      type: sequelize.QueryTypes.SELECT
    });

    // Get monthly revenue data
    const monthlyRevenue = await sequelize.query(`
      SELECT 
        DATE_TRUNC('month', o."createdAt") as month,
        COALESCE(SUM(oi.quantity * oi."unitPrice"), 0) as revenue
      FROM "order_items" oi
      JOIN "orders" o ON oi."orderId" = o.id
      JOIN "products" p ON oi."productId" = p.id
      WHERE p."farmId" = :farmId
        AND o."createdAt" BETWEEN :yearAgo AND :endDate
        AND o.status NOT IN ('cancelled')
        AND o."paymentStatus" NOT IN ('refunded')
      GROUP BY DATE_TRUNC('month', o."createdAt")
      ORDER BY month
    `, {
      replacements: { 
        farmId, 
        yearAgo: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
        endDate: end 
      },
      type: sequelize.QueryTypes.SELECT
    });

    // Get top selling products for the farm
    const topProducts = await sequelize.query(`
      SELECT 
        p.id,
        p.name,
        SUM(oi.quantity) as total_quantity,
        COALESCE(SUM(oi.quantity * oi."unitPrice"), 0) as total_revenue
      FROM "order_items" oi
      JOIN "products" p ON oi."productId" = p.id
      JOIN "orders" o ON oi."orderId" = o.id
      WHERE p."farmId" = :farmId
        AND o."createdAt" BETWEEN :startDate AND :endDate
        AND o.status NOT IN ('cancelled')
        AND o."paymentStatus" NOT IN ('refunded')
      GROUP BY p.id, p.name
      ORDER BY total_quantity DESC
      LIMIT 5
    `, {
      replacements: { farmId, startDate: start, endDate: end },
      type: sequelize.QueryTypes.SELECT
    });

    // Get pending orders
    const pendingOrders = await sequelize.query(`
      SELECT COUNT(DISTINCT o.id) as count
      FROM "order_items" oi
      JOIN "orders" o ON oi."orderId" = o.id
      JOIN "products" p ON oi."productId" = p.id
      WHERE p."farmId" = :farmId
        AND o.status IN ('pending', 'confirmed', 'processing')
        AND o."paymentStatus" NOT IN ('refunded', 'failed')
    `, {
      replacements: { farmId },
      type: sequelize.QueryTypes.SELECT
    });

    // Safely access the pending order count
    const pendingOrderCount = pendingOrders && pendingOrders.length > 0 ? 
      parseInt(pendingOrders[0].count) || 0 : 0;

    // Initialize order status counts with defaults
    const orderStatusCounts = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      ready: 0,
      out_for_delivery: 0,
      delivered: 0,
      picked_up: 0,
      cancelled: 0
    };
    
    // Update counts based on query results (only if present)
    if (ordersByStatus && ordersByStatus.length > 0) {
      ordersByStatus.forEach(item => {
        if (item.status && item.status in orderStatusCounts) {
          orderStatusCounts[item.status] = parseInt(item.count);
        }
      });
    }

    // Build and return the final result
    return {
      totalOrders: parseInt(statistics[0].total_orders) || 0,
      totalRevenue: parseFloat(statistics[0].total_revenue) || 0,
      ordersByStatus: orderStatusCounts,
      revenue: {
        total: parseFloat(statistics[0].total_revenue) || 0,
        daily: (dailyRevenue || []).map(day => ({
          date: day.day,
          amount: parseFloat(day.revenue) || 0
        })),
        weekly: (weeklyRevenue || []).map(week => ({
          week: week.week,
          amount: parseFloat(week.revenue) || 0
        })),
        monthly: (monthlyRevenue || []).map(month => ({
          month: month.month,
          amount: parseFloat(month.revenue) || 0
        }))
      },
      customers: parseInt(statistics[0].unique_customers) || 0,
      topProducts: (topProducts || []).map(p => ({
        productId: p.id,
        name: p.name,
        totalQuantity: parseInt(p.total_quantity) || 0,
        totalRevenue: parseFloat(p.total_revenue) || 0
      })),
      pendingOrders: pendingOrderCount
    };
  } catch (error) {
    logger.error(`Error getting farm order stats: ${error.message}`);
    // Return default empty stats object instead of throwing
    return {
      totalOrders: 0,
      totalRevenue: 0,
      ordersByStatus: {
        pending: 0,
        confirmed: 0,
        processing: 0,
        ready: 0,
        out_for_delivery: 0,
        delivered: 0,
        picked_up: 0,
        cancelled: 0
      },
      revenue: {
        total: 0,
        daily: [],
        weekly: [],
        monthly: []
      },
      customers: 0,
      topProducts: [],
      pendingOrders: 0
    };
  }
}

/**
 * Calculate global order statistics (admin only)
 * @param {Date} startDate - Start date for the statistics period
 * @param {Date} endDate - End date for the statistics period
 * @returns {Object} Global order statistics
 */
async function getGlobalOrderStats(startDate, endDate) {
  try {
    // Format dates
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    // Total orders in the system
    const orderCount = await Order.count({
      where: {
        createdAt: {
          [Op.between]: [start, end]
        }
      }
    });

    // Total revenue
    const totalRevenue = await Order.sum('totalAmount', {
      where: {
        status: {
          [Op.notIn]: ['cancelled']
        },
        paymentStatus: {
          [Op.notIn]: ['refunded']
        },
        createdAt: {
          [Op.between]: [start, end]
        }
      }
    });

    // Total unique customers
    const uniqueCustomers = await Order.count({
      distinct: true,
      col: 'userId',
      where: {
        createdAt: {
          [Op.between]: [start, end]
        }
      }
    });

    // Average order value
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Top selling products
    const topProducts = await OrderItem.findAll({
      attributes: [
        'productId',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
        [sequelize.fn('SUM', sequelize.col('totalPrice')), 'totalRevenue']
      ],
      include: [
        {
          model: Product,
          attributes: ['name', 'farmId', 'category'],
          include: [
            {
              model: Farm,
              as: 'Farm',
              attributes: ['name']
            }
          ]
        },
        {
          model: Order,
          as: 'Order',
          attributes: [],
          where: {
            createdAt: {
              [Op.between]: [start, end]
            }
          }
        }
      ],
      group: ['OrderItem.productId', 'Product.id', 'Product.name', 'Product.farmId', 'Product.category', 'Product->Farm.id', 'Product->Farm.name'],
      order: [[sequelize.fn('SUM', sequelize.col('totalPrice')), 'DESC']],
      limit: 10,
      raw: true
    });

    // Top farms by revenue
    const topFarms = await OrderItem.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('totalPrice')), 'totalRevenue']
      ],
      include: [
        {
          model: Product,
          attributes: ['farmId'],
          include: [
            {
              model: Farm,
              as: 'Farm',
              attributes: ['name']
            }
          ]
        },
        {
          model: Order,
          as: 'Order',
          attributes: [],
          where: {
            status: {
              [Op.notIn]: ['cancelled']
            },
            paymentStatus: {
              [Op.notIn]: ['refunded']
            },
            createdAt: {
              [Op.between]: [start, end]
            }
          }
        }
      ],
      group: ['Product.farmId', 'Product->Farm.id', 'Product->Farm.name'],
      order: [[sequelize.fn('SUM', sequelize.col('totalPrice')), 'DESC']],
      limit: 5,
      raw: true
    });

    // Order status breakdown
    const ordersByStatus = await Order.findAll({
      attributes: [
        'status', 
        [sequelize.fn('COUNT', sequelize.col('status')), 'statusCount']
      ],
      where: {
        createdAt: {
          [Op.between]: [start, end]
        }
      },
      group: ['status'],
      raw: true
    });

    // Convert to easily usable format
    const statusCounts = {};
    ordersByStatus.forEach(item => {
      statusCounts[item.status] = parseInt(item.statusCount);
    });

    // Daily order counts
    const dailyOrders = await Order.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        createdAt: {
          [Op.between]: [start, end]
        }
      },
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    // Revenue by payment method
    const revenueByPaymentMethod = await OrderItem.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('totalPrice')), 'totalRevenue']
      ],
      include: [
        {
          model: Order,
          as: 'Order',
          attributes: ['paymentMethod'],
          where: {
            status: {
              [Op.notIn]: ['cancelled']
            },
            paymentStatus: {
              [Op.notIn]: ['refunded']
            },
            createdAt: {
              [Op.between]: [start, end]
            }
          }
        }
      ],
      group: ['Order.paymentMethod'],
      raw: true
    });

    return {
      totalOrders: orderCount,
      totalRevenue: totalRevenue || 0,
      uniqueCustomers: uniqueCustomers,
      averageOrderValue: averageOrderValue || 0,
      ordersByStatus: statusCounts,
      topProducts: topProducts.map(p => ({
        productId: p.productId,
        name: p['Product.name'],
        farmId: p['Product.farmId'],
        farmName: p['Product->Farm.name'],
        category: p['Product.category'],
        totalQuantity: parseFloat(p.totalQuantity),
        totalRevenue: parseFloat(p.totalRevenue)
      })),
      topFarms: topFarms.map(f => ({
        farmId: f['Product.farmId'],
        name: f['Product->Farm.name'],
        totalRevenue: parseFloat(f.totalRevenue)
      })),
      dailyOrders: dailyOrders.map(d => ({
        date: d.date,
        count: parseInt(d.count)
      })),
      revenueByPaymentMethod: revenueByPaymentMethod.map(r => ({
        paymentMethod: r['Order.paymentMethod'],
        totalRevenue: parseFloat(r.totalRevenue)
      }))
    };
  } catch (error) {
    logger.error(`Error calculating global order stats: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getUserOrderStats,
  getFarmOrderStats,
  getGlobalOrderStats
};
