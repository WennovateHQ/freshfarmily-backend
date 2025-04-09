/**
 * Product Routes
 * 
 * Defines the product management API routes for the FreshFarmily system
 */

const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { authenticate, requireActiveUser, requirePermissions } = require('../middleware/auth');
const logger = require('../utils/logger');
const { Product, ProductPhoto, ProductReview } = require('../models/product');
const { Farm } = require('../models/farm');
const { User } = require('../models/user');
const { sequelize } = require('../config/database');
const searchService = require('../services/searchService');

// Create a router for specific non-ID routes
const router = express.Router();

// Create a separate router for ID-specific routes
const idRouter = express.Router({ mergeParams: true });

// Mount the ID router for all ID-specific routes
router.use('/:id', idRouter);

// Find product by ID middleware - used across multiple routes
async function findProductById(req, res, next) {
  try {
    // Log info
    logger.debug(`Finding product by ID: ${req.params.id}`);
    
    // Find the product with explicit attributes
    const product = await Product.findByPk(req.params.id, {
      attributes: [
        'id', 'name', 'description', 'price', 'unit', 
        'quantityAvailable', 'isOrganic', 'isAvailable', 'category',
        'createdAt', 'updatedAt', 'farmId'
      ]
    });
    
    // If no product is found, return 404
    if (!product) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found'
      });
    }
    
    // Get the farm for the product with explicit attributes
    const farm = await Farm.findByPk(product.farmId, {
      attributes: ['id', 'name', 'description', 'city', 'state', 'isActive', 'address', 'zipCode']
    });
    
    // If no farm found, return 404
    if (!farm) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Farm not found for product'
      });
    }
    
    // Add product and farm to request
    req.product = product;
    req.farm = farm;
    
    // Continue to the next middleware
    next();
  } catch (error) {
    logger.error(`Error finding product: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error processing product request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      service: 'freshfarmily-api'
    });
  }
}

/**
 * @swagger
 * /api/products/search:
 *   get:
 *     summary: Search products with advanced matching
 *     description: Search for products by keyword with advanced relevance and fuzzy matching
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: farmId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by farm ID
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price
 *       - in: query
 *         name: isOrganic
 *         schema:
 *           type: boolean
 *         description: Filter by organic certification
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 1
 *         description: Page number
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Successful search
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.get('/search', [
  query('q').notEmpty().withMessage('Search query is required'),
  query('category').optional().trim(),
  query('farmId').optional().isUUID().withMessage('Invalid farm ID'),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('isOrganic').optional().isBoolean(),
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
    const { q, category, farmId, minPrice, maxPrice, isOrganic } = req.query;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;

    // Create filters object
    const filters = {
      category,
      farmId,
      minPrice,
      maxPrice,
      isOrganic: isOrganic === 'true' ? true : (isOrganic === 'false' ? false : undefined)
    };

    // Perform search
    const searchResults = await searchService.searchProducts(q, filters, page, pageSize);

    res.status(200).json({
      success: true,
      query: q,
      ...searchResults
    });
  } catch (error) {
    logger.error(`Error searching products: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to search products',
      message: error.message
    });
  }
});

/**
 * @route GET /api/products/categories
 * @description Get all product categories
 * @access Public
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']],
      where: {
        isAvailable: true
      },
      raw: true
    });

    res.status(200).json({
      success: true,
      categories: categories.map(c => c.category).filter(Boolean)
    });
  } catch (error) {
    logger.error(`Error fetching product categories: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve product categories'
    });
  }
});

/**
 * @route GET /api/products
 * @description Get all products with pagination and filtering
 * @access Public
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim(),
  query('category').optional().trim(),
  query('farmId').optional().isUUID().withMessage('Invalid farm ID'),
  query('isOrganic').optional().isBoolean(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('sortBy').optional().isIn(['price_asc', 'price_desc', 'name_asc', 'name_desc', 'newest', 'oldest']).withMessage('Invalid sort option')
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

    // Build database query options
    const queryOptions = {
      attributes: [
        'id', 'name', 'description', 'price', 'unit', 
        'quantityAvailable', 'isOrganic', 'isAvailable', 'category'
      ],
      where: {
        isAvailable: true
      },
      include: [
        {
          model: Farm,
          attributes: ['id', 'name', 'city', 'state', 'isActive'],
          where: {
            isActive: true
          }
        },
        {
          model: ProductPhoto,
          as: 'ProductPhotos',
          limit: 1,
          where: {
            isMain: true
          },
          required: false
        }
      ],
      limit,
      offset
    };

    // Add filters
    if (req.query.search) {
      queryOptions.where.name = { [sequelize.Op.iLike]: `%${req.query.search}%` };
    }

    if (req.query.category) {
      queryOptions.where.category = req.query.category;
    }

    if (req.query.farmId) {
      queryOptions.where.farmId = req.query.farmId;
    }

    if (req.query.isOrganic !== undefined) {
      queryOptions.where.isOrganic = req.query.isOrganic === 'true';
    }

    // Initialize price filter object if needed
    if (req.query.minPrice || req.query.maxPrice) {
      queryOptions.where.price = queryOptions.where.price || {};
    }

    if (req.query.minPrice) {
      queryOptions.where.price[sequelize.Op.gte] = parseFloat(req.query.minPrice);
    }

    if (req.query.maxPrice) {
      queryOptions.where.price[sequelize.Op.lte] = parseFloat(req.query.maxPrice);
    }

    // Add sorting
    const sortOptions = {
      price_asc: [['price', 'ASC']],
      price_desc: [['price', 'DESC']],
      name_asc: [['name', 'ASC']],
      name_desc: [['name', 'DESC']],
      newest: [['createdAt', 'DESC']],
      oldest: [['createdAt', 'ASC']]
    };

    queryOptions.order = sortOptions[req.query.sortBy] || sortOptions.newest;

    // Execute query
    const { count, rows } = await Product.findAndCountAll(queryOptions);

    // Format products for response
    const products = rows.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price), // Ensure price is a number for toFixed() method
      unit: product.unit,
      quantityAvailable: Number(product.quantityAvailable), // Ensure quantity is a number
      isOrganic: Boolean(product.isOrganic),
      isAvailable: Boolean(product.isAvailable),
      category: product.category,
      // Add default values for fields that might not exist in DB
      nutritionalInfo: {},
      storageInstructions: '',
      growingPractices: [],
      harvestDate: null,
      farm: {
        id: product.Farm.id,
        name: product.Farm.name,
        city: product.Farm.city,
        state: product.Farm.state,
        isVerified: Boolean(product.Farm.isActive), // Map isActive to isVerified for frontend compatibility
        acceptsPickup: true,
        acceptsDelivery: true
      },
      image: product.ProductPhotos && product.ProductPhotos.length > 0 ? 
             product.ProductPhotos[0].url : '/images/no-image.png'
    }));

    // Return response
    return res.status(200).json({
      products,
      total: count,
      page: page,
      pageSize: limit,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    logger.error(`Error fetching products: ${error.message}`);
    logger.error(`Error stack: ${error.stack}`);

    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch products'
    });
  }
});

/**
 * @route GET /api/products/:id
 * @description Get product by ID with details
 * @access Public
 */
idRouter.get('/', [
  param('id').optional().isString().withMessage('Invalid product ID')
], findProductById, async (req, res) => {
  try {
    // Product ID must be provided
    if (!req.params.id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Product ID is required'
      });
    }
    
    // Find the product with all related data
    const product = await Product.findByPk(req.params.id, {
      attributes: [
        'id', 'name', 'description', 'price', 'unit', 
        'quantityAvailable', 'isOrganic', 'isAvailable', 'category',
        'createdAt', 'updatedAt', 'farmId'
      ],
      include: [
        {
          model: Farm,
          attributes: ['id', 'name', 'description', 'city', 'state', 'isActive']
        },
        {
          model: ProductPhoto,
          as: 'ProductPhotos',
          attributes: ['id', 'url', 'isMain']
        },
        {
          model: ProductReview,
          as: 'Reviews',
          attributes: ['id', 'rating', 'comment', 'createdAt', 'userId']
        }
      ]
    });
    
    // If product not found, return 404
    if (!product) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found'
      });
    }

    // Format the response in the structure expected by the frontend
    const formattedProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price || 0), // Ensure price is a number for toFixed() method
      unit: product.unit,
      quantityAvailable: Number(product.quantityAvailable || 0), // Ensure quantity is a number
      isOrganic: Boolean(product.isOrganic),
      isAvailable: Boolean(product.isAvailable),
      category: product.category,
      nutritionalInfo: {}, // Default empty object since field doesn't exist in DB
      storageInstructions: '', // Default empty string since field doesn't exist in DB
      growingPractices: [], // Default empty array since field doesn't exist in DB
      harvestDate: null, // Default null since field might not exist in DB
      images: product.ProductPhotos ? product.ProductPhotos.map(photo => ({
        id: photo.id,
        url: photo.url,
        isPrimary: photo.isPrimary || photo.isMain
      })) : [],
      farm: {
        id: product.Farm.id,
        name: product.Farm.name,
        description: product.Farm.description || '',
        city: product.Farm.city,
        state: product.Farm.state,
        isVerified: Boolean(product.Farm.isActive), // Map isActive to isVerified for frontend compatibility
        acceptsPickup: true, // Default values since these fields don't exist in the model
        acceptsDelivery: true // Default values since these fields don't exist in the model
      },
      reviews: product.Reviews ? product.Reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        userId: review.userId,
        user: {
          id: review.userId,
          name: 'User' // Fallback name since we don't have user details
        }
      })) : [],
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      // Add these fields to match frontend expectations
      units: [
        { type: product.unit, price: Number(product.price || 0), available: Number(product.quantityAvailable || 0) }
      ],
      additionalServices: []
    };

    return res.status(200).json(formattedProduct);
  } catch (error) {
    logger.error('Error fetching product by ID:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching the product details',
      service: 'freshfarmily-api'
    });
  }
});

/**
 * @route POST /api/products
 * @description Create a new product
 * @access Private (farmers only)
 */
router.post('/', [
  authenticate,
  requireActiveUser,
  requirePermissions(['write']),
  body('farmId').isUUID().withMessage('Valid farm ID is required'),
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').optional().trim(),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('subcategory').optional().trim(),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('unit').trim().notEmpty().withMessage('Unit is required'),
  body('quantityAvailable').isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
  body('isOrganic').optional().isBoolean(),
  body('isAvailable').optional().isBoolean(),
  // Updated to Allow empty values or relative paths starting with "/"
  body('imageUrl')
  .optional()
  .trim()
  .custom(value => {
    // Allow empty values or relative paths starting with "/"
    if (!value || value.startsWith('/')) return true;
    return /^(ftp|http|https):\/\/[^ "]+$/.test(value);
  })
  .withMessage('Invalid image URL'),
  body('harvestedDate').optional().isISO8601().withMessage('Invalid harvested date format'),
  body('expectedAvailability').optional().isISO8601().withMessage('Invalid expected availability date format'),
  body('tags').optional().isArray(),
  body('nutritionInfo').optional(),
  body('isFeatured').optional().isBoolean(),
  body('discountPercent').optional().isInt({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),
  body('minOrderQuantity').optional().isFloat({ min: 0 }),
  body('maxOrderQuantity').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array()); //Remove
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if farm exists and belongs to the user
    const farm = await Farm.findByPk(req.body.farmId);

    if (!farm) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Farm not found'
      });
    }

    // Check authorization
    const canAddProduct = req.user.role === 'admin' ||
                         (req.user.role === 'farmer' &&
                          farm.farmerId === req.user.userId);

    if (!canAddProduct) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to add products to this farm'
      });
    }

    // Check farm status
    if (farm.isActive !== true && farm.farmerId !== req.user.userId && req.user.role !== 'admin') {
      logger.error(`Farm status is ${farm.isActive} and user role is ${req.user.role}. Cannot add products to an inactive farm.`);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot add products to an inactive farm'
      });
    }

    // Create product with the validated data
    const productData = {
      name: req.body.name,
      description: req.body.description || '',
      farmId: req.body.farmId,
      category: req.body.category,
      subcategory: req.body.subcategory || '',
      price: parseFloat(req.body.price),
      unit: req.body.unit,
      quantityAvailable: parseFloat(req.body.quantityAvailable),
      isOrganic: req.body.isOrganic || false,
      isAvailable: req.body.isAvailable || true,
      imageUrl: req.body.imageUrl || ''
    };

    const product = await Product.create(productData);

    logger.info(`New product created: ${product.name} for farm ${farm.name}`);

    return res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    logger.error(`Error creating product: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create product'
    });
  }
});

/**
 * @route PUT /api/products/:id
 * @description Update product details
 * @access Private (farm owner or admin)
 */
idRouter.put('/', [
  authenticate,
  requireActiveUser,
  requirePermissions(['update']),
  body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty if provided'),
  body('description').optional().trim(),
  body('category').optional().trim().notEmpty().withMessage('Category cannot be empty if provided'),
  body('subcategory').optional().trim(),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('unit').optional().trim().notEmpty().withMessage('Unit cannot be empty if provided'),
  body('quantityAvailable').optional().isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
  body('isOrganic').optional().isBoolean(),
  body('isAvailable').optional().isBoolean(),
  body('imageUrl').optional().trim().isURL().withMessage('Invalid image URL'),
  body('harvestedDate').optional().isISO8601().withMessage('Invalid harvested date format'),
  body('expectedAvailability').optional().isISO8601().withMessage('Invalid expected availability date format'),
  body('tags').optional().isArray(),
  body('nutritionInfo').optional(),
  body('isFeatured').optional().isBoolean(),
  body('discountPercent').optional().isInt({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),
  body('minOrderQuantity').optional().isFloat({ min: 0 }),
  body('maxOrderQuantity').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['active', 'out_of_stock', 'coming_soon', 'archived']).withMessage('Invalid status')
], findProductById, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get product
    const product = req.product;

    // Check authorization
    const canUpdate = req.user.role === 'admin' ||
                     (req.user.role === 'farmer' &&
                      product.Farm.farmerId === req.user.userId);

    if (!canUpdate) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update this product'
      });
    }

    // Prevent changing farmId
    if (req.body.farmId && req.body.farmId !== product.farmId && req.user.role !== 'admin') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot change the farm of a product'
      });
    }

    // Update product
    await product.update(req.body);

    logger.info(`Product updated: ${product.name}`);

    return res.status(200).json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    logger.error(`Error updating product: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update product'
    });
  }
});

/**
 * @route DELETE /api/products/:id
 * @description Delete a product
 * @access Private (farm owner or admin)
 */
idRouter.delete('/', [
  authenticate,
  requireActiveUser,
  requirePermissions(['delete'])
], findProductById, async (req, res) => {
  try {
    // Get product
    const product = req.product;

    // Check authorization
    const canDelete = req.user.role === 'admin' ||
                     (req.user.role === 'farmer' &&
                      product.Farm.farmerId === req.user.userId &&
                      req.user.permissions.includes('delete_own'));

    if (!canDelete) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this product'
      });
    }

    // Delete product
    const productName = product.name;
    await product.destroy();

    logger.info(`Product deleted: ${productName}`);

    return res.status(200).json({
      message: 'Product deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting product: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete product'
    });
  }
});

/**
 * @route POST /api/products/:id/reviews
 * @description Add a review for a product
 * @access Private (consumers only)
 */
idRouter.post('/reviews', [
  authenticate,
  requireActiveUser,
  requirePermissions(['create_order']), // Only consumers can review products
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('review').optional().trim()
], findProductById, async (req, res) => {
  try {
    // Get product
    const product = req.product;

    // Check if user has purchased this product
    // This would typically check order history, but simplified here
    const hasPurchased = true; // Replace with actual check

    // Create review
    const review = await ProductReview.create({
      productId: req.params.id,
      userId: req.user.userId,
      rating: req.body.rating,
      review: req.body.review,
      isVerifiedPurchase: hasPurchased,
      status: 'pending' // Reviews are pending until approved
    });

    logger.info(`New product review added for: ${product.name}`);

    return res.status(201).json({
      message: 'Review submitted successfully and pending approval',
      review
    });
  } catch (error) {
    logger.error(`Error adding product review: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to submit review'
    });
  }
});

/**
 * @route GET /api/products/farm/:farmId
 * @description Get all products for a specific farm
 * @access Public
 */
router.get('/farm/:farmId', async (req, res) => {
  try {
    const { farmId } = req.params;
    
    // Validate the farm ID
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
      attributes: [
        'id', 'name', 'description', 'price', 'unit', 
        'quantityAvailable', 'isOrganic', 'isAvailable', 'category'
      ],
      where: {
        farmId: farmId
      },
      include: [
        { 
          model: Farm,
          attributes: ['id', 'name', 'address', 'city', 'state', 'zipCode', 'isActive'] 
        },
        { 
          model: ProductPhoto, 
          as: 'ProductPhotos',
          required: false
        }
      ]
    });

    // Format products for response
    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: Number(product.price), // Ensure price is a number for toFixed() method
      unit: product.unit,
      quantityAvailable: Number(product.quantityAvailable), // Ensure quantity is a number
      isOrganic: Boolean(product.isOrganic),
      isAvailable: Boolean(product.isAvailable),
      category: product.category,
      farm: {
        id: product.Farm.id,
        name: product.Farm.name,
        address: product.Farm.address,
        city: product.Farm.city,
        state: product.Farm.state,
        province: product.Farm.state, // For frontend compatibility
        zipCode: product.Farm.zipCode,
        isVerified: Boolean(product.Farm.isActive) // Map isActive to isVerified for frontend
      },
      image: product.ProductPhotos && product.ProductPhotos.length > 0 ? 
             product.ProductPhotos[0].url : '/images/no-image.png'
    }));

    // Return response
    return res.status(200).json({
      farmId: farmId,
      products: formattedProducts,
      total: formattedProducts.length
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

/**
 * @swagger
 * /api/products/search:
 */

// Export the router to be mounted by app.js
module.exports = router;
