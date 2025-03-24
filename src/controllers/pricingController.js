/**
 * Pricing Controller
 * 
 * RESTful API endpoints for pricing-related operations:
 * - Calculate order charges
 * - Get customer order summary
 * - Get detailed order charges (admin only)
 * - Manage pricing configurations
 */

const pricingService = require('../services/pricingService');
const { PricingConfiguration } = require('../models/pricing');
const logger = require('../utils/logger');
const { get_user_with_permissions } = require('../middleware/jwt');

/**
 * Calculate order charges for a potential order
 * @route POST /api/pricing/calculate
 * @access Public
 */
const calculateOrderCharges = async (req, res) => {
  try {
    const { order, deliveryDetails } = req.body;
    const userId = req.user ? req.user.id : null;
    
    if (!order || !deliveryDetails) {
      return res.status(400).json({ message: 'Order and delivery details are required' });
    }
    
    const charges = await pricingService.calculateOrderCharges(order, userId, deliveryDetails);
    
    // Return the formatted customer-facing charges
    return res.status(200).json({
      productSubtotal: charges.productSubtotal,
      deliveryFee: charges.customerDeliveryFee,
      platformServiceCharge: charges.customerPlatformFee,
      paymentProcessingFee: charges.paymentProcessingFee,
      taxAmount: charges.taxAmount,
      total: charges.finalTotal
    });
  } catch (error) {
    logger.error('Error calculating order charges:', error);
    return res.status(500).json({ message: 'Failed to calculate order charges' });
  }
};

/**
 * Save order charges for a completed order
 * @route POST /api/pricing/saveCharges
 * @access Private
 */
const saveOrderCharges = async (req, res) => {
  try {
    const { order, deliveryDetails } = req.body;
    const userId = req.user.id;
    
    if (!order || !deliveryDetails) {
      return res.status(400).json({ message: 'Order and delivery details are required' });
    }
    
    const charges = await pricingService.calculateOrderCharges(order, userId, deliveryDetails);
    const savedCharges = await pricingService.saveOrderCharges(charges);
    
    return res.status(201).json(savedCharges);
  } catch (error) {
    logger.error('Error saving order charges:', error);
    return res.status(500).json({ message: 'Failed to save order charges' });
  }
};

/**
 * Get customer-facing order summary
 * @route GET /api/pricing/orderSummary/:orderId
 * @access Private
 */
const getOrderSummary = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }
    
    const summary = await pricingService.getCustomerOrderSummary(orderId);
    
    return res.status(200).json(summary);
  } catch (error) {
    logger.error(`Error getting order summary for order ${req.params.orderId}:`, error);
    return res.status(500).json({ message: 'Failed to get order summary' });
  }
};

/**
 * Get detailed order charges (admin only)
 * @route GET /api/pricing/detailedCharges/:orderId
 * @access Private (Admin only)
 */
const getDetailedOrderCharges = async (req, res) => {
  try {
    const { orderId } = req.params;
    const user = await get_user_with_permissions(req);
    
    // Check if user has admin permission
    if (!user || !user.permissions.includes('admin')) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }
    
    const detailedCharges = await pricingService.getDetailedOrderCharges(orderId);
    
    return res.status(200).json(detailedCharges);
  } catch (error) {
    logger.error(`Error getting detailed charges for order ${req.params.orderId}:`, error);
    return res.status(500).json({ message: 'Failed to get detailed order charges' });
  }
};

/**
 * Get active pricing configuration
 * @route GET /api/pricing/configuration
 * @access Private (Admin only)
 */
const getActivePricingConfig = async (req, res) => {
  try {
    const user = await get_user_with_permissions(req);
    
    // Check if user has admin permission
    if (!user || !user.permissions.includes('admin')) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const config = await pricingService.getActivePricingConfig();
    
    return res.status(200).json(config);
  } catch (error) {
    logger.error('Error getting active pricing configuration:', error);
    return res.status(500).json({ message: 'Failed to get pricing configuration' });
  }
};

/**
 * Create new pricing configuration
 * @route POST /api/pricing/configuration
 * @access Private (Admin only)
 */
const createPricingConfig = async (req, res) => {
  try {
    const user = await get_user_with_permissions(req);
    
    // Check if user has admin permission
    if (!user || !user.permissions.includes('admin')) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const configData = req.body;
    
    if (!configData.name) {
      return res.status(400).json({ message: 'Configuration name is required' });
    }
    
    // Create new configuration
    const newConfig = await PricingConfiguration.create({
      ...configData,
      effectiveDate: new Date(configData.effectiveDate) || new Date(),
      expirationDate: configData.expirationDate ? new Date(configData.expirationDate) : null
    });
    
    return res.status(201).json(newConfig);
  } catch (error) {
    logger.error('Error creating pricing configuration:', error);
    return res.status(500).json({ message: 'Failed to create pricing configuration' });
  }
};

/**
 * Update pricing configuration
 * @route PUT /api/pricing/configuration/:id
 * @access Private (Admin only)
 */
const updatePricingConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await get_user_with_permissions(req);
    
    // Check if user has admin permission
    if (!user || !user.permissions.includes('admin')) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const configData = req.body;
    
    // Find the configuration
    const config = await PricingConfiguration.findByPk(id);
    
    if (!config) {
      return res.status(404).json({ message: 'Pricing configuration not found' });
    }
    
    // Update configuration
    await config.update({
      ...configData,
      effectiveDate: configData.effectiveDate ? new Date(configData.effectiveDate) : config.effectiveDate,
      expirationDate: configData.expirationDate ? new Date(configData.expirationDate) : config.expirationDate
    });
    
    return res.status(200).json(config);
  } catch (error) {
    logger.error(`Error updating pricing configuration ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to update pricing configuration' });
  }
};

module.exports = {
  calculateOrderCharges,
  saveOrderCharges,
  getOrderSummary,
  getDetailedOrderCharges,
  getActivePricingConfig,
  createPricingConfig,
  updatePricingConfig
};
