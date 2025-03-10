/**
 * Farm Search Routes
 * 
 * Dedicated search routes for farms to avoid conflicts with dynamic ID routes
 */

const express = require('express');
const { query, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const searchService = require('../services/searchService');

const router = express.Router();

/**
 * @route GET /api/farms-search
 * @description Search farms with advanced matching
 * @access Public
 */
router.get('/', [
  query('q').notEmpty().withMessage('Search query is required'),
  query('city').optional().trim(),
  query('state').optional().trim(),
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
    const { q, city, state, isVerified, acceptsDelivery } = req.query;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;

    // Create filters object
    const filters = {
      city,
      state,
      isVerified: isVerified === 'true' ? true : (isVerified === 'false' ? false : undefined),
      acceptsDelivery: acceptsDelivery === 'true' ? true : (acceptsDelivery === 'false' ? false : undefined)
    };

    // Perform search
    const searchResults = await searchService.searchFarms(q, filters, page, pageSize);

    res.status(200).json({
      success: true,
      query: q,
      ...searchResults
    });
  } catch (error) {
    logger.error(`Error searching farms: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to search farms',
      message: error.message
    });
  }
});

module.exports = router;
