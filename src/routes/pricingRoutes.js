/**
 * Pricing Routes
 * 
 * API routes for pricing functionality including:
 * - Order charge calculation
 * - Order summaries (customer and admin views)
 * - Pricing configuration management
 */

const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricingController');
const { authenticateJWT, requirePermission } = require('../middleware/auth');

// Public endpoint - calculate potential order charges without authentication
router.post('/calculate', pricingController.calculateOrderCharges);

// Private endpoints - require authentication
router.post('/saveCharges', authenticateJWT, pricingController.saveOrderCharges);
router.get('/orderSummary/:orderId', authenticateJWT, pricingController.getOrderSummary);

// Admin-only endpoints - require admin permission
router.get('/detailedCharges/:orderId', 
  authenticateJWT, 
  requirePermission('admin'), 
  pricingController.getDetailedOrderCharges
);

router.get('/configuration', 
  authenticateJWT, 
  requirePermission('admin'), 
  pricingController.getActivePricingConfig
);

router.post('/configuration', 
  authenticateJWT, 
  requirePermission('admin'), 
  pricingController.createPricingConfig
);

router.put('/configuration/:id', 
  authenticateJWT, 
  requirePermission('admin'), 
  pricingController.updatePricingConfig
);

module.exports = router;
