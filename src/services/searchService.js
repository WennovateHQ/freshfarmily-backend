/**
 * Search Service
 * 
 * Provides advanced search functionality for the FreshFarmily application
 */

const { Op, literal, fn, col, where } = require('sequelize');
const { sequelize } = require('../config/database');
const { Product, ProductPhoto } = require('../models/product');
const { Farm, FarmPhoto } = require('../models/farm');
const { User } = require('../models/user');
const logger = require('../utils/logger');

// Helper function to create case-insensitive search condition for SQLite
const iLike = (column, value) => {
  // Check if using SQLite (which doesn't support ILIKE)
  if (sequelize.options.dialect === 'sqlite') {
    return where(fn('LOWER', col(column)), 'LIKE', `%${value.toLowerCase()}%`);
  }
  // For PostgreSQL and other dialects that support ILIKE
  return { [column]: { [Op.iLike]: `%${value}%` } };
};

/**
 * Search products by query with advanced fuzzy matching and relevance scoring
 * @param {string} query - Search query
 * @param {Object} filters - Additional filters (category, farmId, price range, etc.)
 * @param {number} page - Page number (for pagination)
 * @param {number} pageSize - Items per page
 * @returns {Object} Search results with products and metadata
 */
async function searchProducts(query, filters = {}, page = 1, pageSize = 20) {
  try {
    // Default base query
    const whereClause = {
      isAvailable: true,
      status: 'active',
      [Op.or]: [
        sequelize.where(fn('LOWER', col('Product.name')), 'LIKE', `%${query.toLowerCase()}%`),
        sequelize.where(fn('LOWER', col('Product.description')), 'LIKE', `%${query.toLowerCase()}%`),
        sequelize.where(fn('LOWER', col('Product.category')), 'LIKE', `%${query.toLowerCase()}%`),
        sequelize.where(fn('LOWER', col('Product.tags')), 'LIKE', `%${query.toLowerCase()}%`)
      ]
    };

    // Apply additional filters
    if (filters.category) {
      whereClause.category = filters.category;
    }

    if (filters.farmId) {
      whereClause.farmId = filters.farmId;
    }

    if (filters.isOrganic !== undefined) {
      whereClause.isOrganic = filters.isOrganic;
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      whereClause.price = {};
      
      if (filters.minPrice !== undefined) {
        whereClause.price[Op.gte] = parseFloat(filters.minPrice);
      }
      
      if (filters.maxPrice !== undefined) {
        whereClause.price[Op.lte] = parseFloat(filters.maxPrice);
      }
    }

    // Create search query options
    const searchOptions = {
      where: whereClause,
      include: [
        {
          model: Farm,
          attributes: ['id', 'name', 'city', 'state', 'isVerified'],
          where: {
            status: 'active'
          }
        },
        {
          model: ProductPhoto,
          as: 'ProductPhotos',  // Using the correct association name from index.js
          limit: 1,
          where: {
            isMain: true
          },
          required: false
        }
      ],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order: [
        // Simple ordering for SQLite compatibility
        ['name', 'ASC']
      ]
    };

    // Execute search query
    const { count, rows: products } = await Product.findAndCountAll(searchOptions);

    return {
      products,
      totalCount: count,
      totalPages: Math.ceil(count / pageSize),
      currentPage: page,
      query
    };
  } catch (error) {
    logger.error(`Error searching products: ${error.message}`);
    throw error;
  }
}

/**
 * Search farms by query with advanced fuzzy matching and relevance scoring
 * @param {string} query - Search query
 * @param {Object} filters - Additional filters (location, rating, etc.)
 * @param {number} page - Page number (for pagination)
 * @param {number} pageSize - Items per page
 * @returns {Object} Search results with farms and metadata
 */
async function searchFarms(query, filters = {}, page = 1, pageSize = 20) {
  try {
    // Default base query
    const whereClause = {
      status: 'active',
      [Op.or]: [
        sequelize.where(fn('LOWER', col('Farm.name')), 'LIKE', `%${query.toLowerCase()}%`),
        sequelize.where(fn('LOWER', col('Farm.description')), 'LIKE', `%${query.toLowerCase()}%`),
        sequelize.where(fn('LOWER', col('Farm.city')), 'LIKE', `%${query.toLowerCase()}%`),
        sequelize.where(fn('LOWER', col('Farm.state')), 'LIKE', `%${query.toLowerCase()}%`)
      ]
    };

    // Apply additional filters
    if (filters.city) {
      whereClause.city = sequelize.where(fn('LOWER', col('Farm.city')), 'LIKE', `%${filters.city.toLowerCase()}%`);
    }

    if (filters.state) {
      whereClause.state = filters.state;
    }

    if (filters.isVerified !== undefined) {
      whereClause.isVerified = filters.isVerified;
    }

    if (filters.acceptsDelivery !== undefined) {
      whereClause.acceptsDelivery = filters.acceptsDelivery;
    }

    // Create search query options
    const searchOptions = {
      where: whereClause,
      include: [
        {
          model: User,
          as: 'FarmOwner',  // Match the association name from farm.js
          attributes: ['id', 'firstName', 'lastName'],
          required: false
        },
        {
          model: FarmPhoto,
          as: 'Photos',  // Match the association name from farm.js
          limit: 1,
          where: {
            isMain: true
          },
          required: false
        }
      ],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order: [
        // Simple ordering for SQLite compatibility  
        ['name', 'ASC']
      ]
    };

    // Execute search query
    const { count, rows: farms } = await Farm.findAndCountAll(searchOptions);

    return {
      farms,
      totalCount: count,
      totalPages: Math.ceil(count / pageSize),
      currentPage: page,
      query
    };
  } catch (error) {
    logger.error(`Error searching farms: ${error.message}`);
    throw error;
  }
}

module.exports = {
  searchProducts,
  searchFarms
};
