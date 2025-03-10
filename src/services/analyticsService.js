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
const { QueryTypes, Op } = require('sequelize');
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
    // Validate inputs
    if (!farmId) {
      throw new Error('Farm ID is required');
    }

    // Format dates
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    // Total orders containing products from this farm
    const orderCount = await OrderItem.count({
      distinct: true,
      col: 'orderId',
      include: [
        {
          model: Product,
          required: true,
          where: { farmId },
          attributes: []
        },
        {
          model: Order,
          as: 'Order',
          required: true,
          where: {
            createdAt: {
              [Op.between]: [start, end]
            }
          },
          attributes: []
        }
      ]
    });

    // Total revenue for the farm
    const totalRevenue = await OrderItem.sum('totalPrice', {
      include: [
        {
          model: Product,
          required: true,
          where: { farmId },
          attributes: []
        },
        {
          model: Order,
          as: 'Order',
          required: true,
          where: {
            status: {
              [Op.notIn]: ['cancelled', 'refunded']
            },
            createdAt: {
              [Op.between]: [start, end]
            }
          },
          attributes: []
        }
      ]
    });

    // Total units sold
    const totalUnitsSold = await OrderItem.sum('quantity', {
      include: [
        {
          model: Product,
          required: true,
          where: { farmId },
          attributes: []
        },
        {
          model: Order,
          as: 'Order',
          required: true,
          where: {
            createdAt: {
              [Op.between]: [start, end]
            }
          },
          attributes: []
        }
      ]
    });

    // Get top products sold
    const topProducts = await OrderItem.findAll({
      attributes: [
        'productId',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
        [sequelize.fn('SUM', sequelize.col('totalPrice')), 'totalRevenue']
      ],
      include: [
        {
          model: Product,
          required: true,
          where: { farmId },
          attributes: ['name', 'category', 'unit']
        },
        {
          model: Order,
          as: 'Order',
          required: true,
          where: {
            createdAt: {
              [Op.between]: [start, end]
            }
          },
          attributes: []
        }
      ],
      group: ['OrderItem.productId', 'Product.id', 'Product.name', 'Product.category', 'Product.unit'],
      order: [[sequelize.fn('SUM', sequelize.col('totalPrice')), 'DESC']],
      limit: 10,
      raw: true
    });

    // Order status breakdown
    const ordersByStatus = await Order.findAll({
      attributes: [
        'status', 
        [sequelize.fn('COUNT', sequelize.col('id')), 'statusCount']
      ],
      include: [
        {
          model: OrderItem,
          as: 'Items',
          attributes: [],
          required: true,
          include: [
            {
              model: Product,
              required: true,
              where: { farmId },
              attributes: []
            }
          ]
        }
      ],
      where: {
        createdAt: {
          [Op.between]: [start, end]
        }
      },
      group: ['Order.status'],
      raw: true
    });

    // Convert to easily usable format
    const statusCounts = {};
    ordersByStatus.forEach(item => {
      statusCounts[item.status] = parseInt(item.statusCount);
    });

    // Calculate growth vs previous period
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - (end - start) / (1000 * 60 * 60 * 24));
    
    const previousRevenue = await OrderItem.sum('totalPrice', {
      include: [
        {
          model: Product,
          required: true,
          where: { farmId },
          attributes: []
        },
        {
          model: Order,
          as: 'Order',
          required: true,
          where: {
            status: {
              [Op.notIn]: ['cancelled', 'refunded']
            },
            createdAt: {
              [Op.between]: [previousStart, start]
            }
          },
          attributes: []
        }
      ]
    }) || 0;
    
    // Calculate growth percentage
    let growthPercentage = 0;
    if (previousRevenue > 0) {
      growthPercentage = ((totalRevenue - previousRevenue) / previousRevenue) * 100;
    }

    return {
      totalOrders: orderCount,
      totalRevenue: totalRevenue || 0,
      totalUnitsSold: totalUnitsSold || 0,
      averageOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
      ordersByStatus: statusCounts,
      growthVsPreviousPeriod: {
        previousPeriodRevenue: previousRevenue,
        growthPercentage: growthPercentage
      },
      topProducts: topProducts.map(p => ({
        productId: p.productId,
        name: p['Product.name'],
        category: p['Product.category'],
        unit: p['Product.unit'],
        totalQuantity: parseFloat(p.totalQuantity),
        totalRevenue: parseFloat(p.totalRevenue)
      }))
    };
  } catch (error) {
    logger.error(`Error calculating farm order stats: ${error.message}`);
    throw error;
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
          [Op.notIn]: ['cancelled', 'refunded']
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
              [Op.notIn]: ['cancelled', 'refunded']
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
              [Op.notIn]: ['cancelled', 'refunded']
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
