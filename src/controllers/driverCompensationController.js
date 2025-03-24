/**
 * Driver Compensation Controller
 * 
 * RESTful API endpoints for driver compensation operations:
 * - Calculate driver earnings
 * - Save and process driver payments
 * - Generate earnings projections
 * - Retrieve compensation configuration
 */

const driverCompensationService = require('../services/driverCompensationService');
const { DriverCompensationConfig, DriverEarnings } = require('../models/pricing');
const logger = require('../utils/logger');
const { get_user_with_permissions } = require('../middleware/jwt');

/**
 * Calculate driver earnings for a specific period
 * @route POST /api/driver/earnings/calculate
 * @access Private (Admin or self)
 */
const calculateDriverEarnings = async (req, res) => {
  try {
    const { driverId, startDate, endDate } = req.body;
    const user = await get_user_with_permissions(req);
    
    // Check permissions - must be admin or the driver themselves
    if (!user || (!user.permissions.includes('admin') && user.id !== driverId)) {
      return res.status(403).json({ message: 'You do not have permission to access these earnings' });
    }
    
    if (!driverId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Driver ID, start date, and end date are required' });
    }
    
    const earnings = await driverCompensationService.calculatePeriodEarnings(
      driverId, 
      new Date(startDate), 
      new Date(endDate)
    );
    
    return res.status(200).json(earnings);
  } catch (error) {
    logger.error('Error calculating driver earnings:', error);
    return res.status(500).json({ message: 'Failed to calculate driver earnings' });
  }
};

/**
 * Save driver earnings
 * @route POST /api/driver/earnings
 * @access Private (Admin only)
 */
const saveDriverEarnings = async (req, res) => {
  try {
    const earningsData = req.body;
    const user = await get_user_with_permissions(req);
    
    // Check if user has admin permission
    if (!user || !user.permissions.includes('admin')) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // Basic validation
    if (!earningsData.driverId || !earningsData.payPeriodStart || !earningsData.payPeriodEnd) {
      return res.status(400).json({ 
        message: 'Driver ID, pay period start, and pay period end are required' 
      });
    }
    
    // Format dates
    earningsData.payPeriodStart = new Date(earningsData.payPeriodStart);
    earningsData.payPeriodEnd = new Date(earningsData.payPeriodEnd);
    
    const savedEarnings = await driverCompensationService.saveDriverEarnings(earningsData);
    
    return res.status(201).json(savedEarnings);
  } catch (error) {
    logger.error('Error saving driver earnings:', error);
    return res.status(500).json({ message: 'Failed to save driver earnings' });
  }
};

/**
 * Get driver earnings for a specific period
 * @route GET /api/driver/earnings/:driverId
 * @access Private (Admin or self)
 */
const getDriverEarnings = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { startDate, endDate } = req.query;
    const user = await get_user_with_permissions(req);
    
    // Check permissions - must be admin or the driver themselves
    if (!user || (!user.permissions.includes('admin') && user.id !== driverId)) {
      return res.status(403).json({ message: 'You do not have permission to access these earnings' });
    }
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    const earnings = await driverCompensationService.getDriverEarnings(
      driverId, 
      new Date(startDate), 
      new Date(endDate)
    );
    
    if (!earnings) {
      return res.status(404).json({ message: 'Earnings record not found' });
    }
    
    return res.status(200).json(earnings);
  } catch (error) {
    logger.error(`Error getting earnings for driver ${req.params.driverId}:`, error);
    return res.status(500).json({ message: 'Failed to retrieve driver earnings' });
  }
};

/**
 * Process payment for driver earnings
 * @route POST /api/driver/earnings/:earningsId/process
 * @access Private (Admin only)
 */
const processDriverPayment = async (req, res) => {
  try {
    const { earningsId } = req.params;
    const { paymentReference } = req.body;
    const user = await get_user_with_permissions(req);
    
    // Check if user has admin permission
    if (!user || !user.permissions.includes('admin')) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    if (!paymentReference) {
      return res.status(400).json({ message: 'Payment reference is required' });
    }
    
    const processedEarnings = await driverCompensationService.processDriverPayment(
      earningsId, 
      paymentReference
    );
    
    return res.status(200).json(processedEarnings);
  } catch (error) {
    logger.error(`Error processing payment for earnings ${req.params.earningsId}:`, error);
    return res.status(500).json({ message: 'Failed to process driver payment' });
  }
};

/**
 * Calculate earnings for all active drivers
 * @route POST /api/driver/earnings/calculateAll
 * @access Private (Admin only)
 */
const calculateAllDriverEarnings = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const user = await get_user_with_permissions(req);
    
    // Check if user has admin permission
    if (!user || !user.permissions.includes('admin')) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    const earningsRecords = await driverCompensationService.calculateAllDriverEarnings(
      new Date(startDate), 
      new Date(endDate)
    );
    
    return res.status(200).json({
      count: earningsRecords.length,
      earnings: earningsRecords
    });
  } catch (error) {
    logger.error('Error calculating all driver earnings:', error);
    return res.status(500).json({ message: 'Failed to calculate earnings for all drivers' });
  }
};

/**
 * Generate earnings projection for a driver
 * @route POST /api/driver/earnings/projection/:driverId
 * @access Private (Admin or self)
 */
const generateEarningsProjection = async (req, res) => {
  try {
    const { driverId } = req.params;
    const projectionParams = req.body;
    const user = await get_user_with_permissions(req);
    
    // Check permissions - must be admin or the driver themselves
    if (!user || (!user.permissions.includes('admin') && user.id !== driverId)) {
      return res.status(403).json({ message: 'You do not have permission to access these projections' });
    }
    
    const projection = await driverCompensationService.generateEarningsProjection(
      driverId, 
      projectionParams
    );
    
    return res.status(200).json(projection);
  } catch (error) {
    logger.error(`Error generating earnings projection for driver ${req.params.driverId}:`, error);
    return res.status(500).json({ message: 'Failed to generate earnings projection' });
  }
};

/**
 * Estimate delivery earnings for a potential delivery
 * This allows drivers to see potential earnings before accepting an order
 * @route POST /api/driver/earnings/estimate
 * @access Private (Driver only)
 */
const estimateDeliveryEarnings = async (req, res) => {
  try {
    const { orderId, estimatedDistanceKm, estimatedTimeMinutes, deliveryDetails } = req.body;
    const user = await get_user_with_permissions(req);
    
    // Check if user has driver permission
    if (!user || !user.permissions.includes('update_delivery')) {
      return res.status(403).json({ message: 'Driver access required' });
    }
    
    if (!estimatedDistanceKm || !estimatedTimeMinutes) {
      return res.status(400).json({ 
        message: 'Estimated distance and time are required' 
      });
    }
    
    const earnings = await driverCompensationService.estimateDeliveryEarnings(
      orderId,
      user.id,
      estimatedDistanceKm,
      estimatedTimeMinutes,
      deliveryDetails || {}
    );
    
    return res.status(200).json(earnings);
  } catch (error) {
    logger.error('Error estimating delivery earnings:', error);
    return res.status(500).json({ message: 'Failed to estimate delivery earnings' });
  }
};

/**
 * Get active driver compensation configuration
 * @route GET /api/driver/compensation/configuration
 * @access Private (Admin only)
 */
const getActiveCompensationConfig = async (req, res) => {
  try {
    const user = await get_user_with_permissions(req);
    
    // Check if user has admin permission
    if (!user || !user.permissions.includes('admin')) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const config = await driverCompensationService.getActiveCompensationConfig();
    
    return res.status(200).json(config);
  } catch (error) {
    logger.error('Error getting active compensation configuration:', error);
    return res.status(500).json({ message: 'Failed to get compensation configuration' });
  }
};

/**
 * Process payment for multiple driver earnings records
 * @route POST /api/driver/earnings/process-batch
 * @access Private (Admin only)
 */
const processBatchDriverPayments = async (req, res) => {
  try {
    const { earningsIds } = req.body;
    const user = await get_user_with_permissions(req);
    
    // Check if user has admin permission
    if (!user || !user.permissions.includes('admin')) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    if (!earningsIds || !Array.isArray(earningsIds) || earningsIds.length === 0) {
      return res.status(400).json({ message: 'Earnings IDs array is required' });
    }
    
    // Fetch all earnings records
    const earningsRecords = await DriverEarnings.findAll({
      where: {
        id: earningsIds,
        isPaid: false
      }
    });
    
    if (earningsRecords.length === 0) {
      return res.status(404).json({ message: 'No unpaid earnings records found with the provided IDs' });
    }
    
    const result = await driverCompensationService.processDriverPayments(earningsRecords);
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error processing batch driver payments:', error);
    return res.status(500).json({ message: 'Failed to process driver payments' });
  }
};

/**
 * Create Stripe Connect account for a driver
 * @route POST /api/driver/connect-account
 * @access Private (Admin or self)
 */
const createDriverConnectAccount = async (req, res) => {
  try {
    const { driverId } = req.body;
    const user = await get_user_with_permissions(req);
    
    // Check permissions - must be admin or the driver themselves
    if (!user || (!user.permissions.includes('admin') && user.id !== driverId)) {
      return res.status(403).json({ message: 'You do not have permission to create this account' });
    }
    
    // Get the target driver (either self or specified by admin)
    const targetDriverId = driverId || user.id;
    
    const { User } = require('../models/user');
    const driver = await User.findByPk(targetDriverId);
    
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    
    // Check if driver already has a Stripe account
    if (driver.stripeAccountId) {
      return res.status(400).json({ 
        message: 'Driver already has a Stripe Connect account',
        accountId: driver.stripeAccountId
      });
    }
    
    const stripeService = require('../services/stripeService');
    const result = await stripeService.createDriverConnectAccount(driver, req.body);
    
    return res.status(201).json({
      success: true,
      accountId: result.accountId,
      onboardingUrl: result.accountLink
    });
  } catch (error) {
    logger.error('Error creating driver Connect account:', error);
    return res.status(500).json({ message: 'Failed to create Stripe Connect account' });
  }
};

/**
 * Create new driver compensation configuration
 * @route POST /api/driver/compensation/configuration
 * @access Private (Admin only)
 */
const createCompensationConfig = async (req, res) => {
  try {
    const configData = req.body;
    const user = await get_user_with_permissions(req);
    
    // Check if user has admin permission
    if (!user || !user.permissions.includes('admin')) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    if (!configData.name) {
      return res.status(400).json({ message: 'Configuration name is required' });
    }
    
    // Create new configuration
    const newConfig = await DriverCompensationConfig.create({
      ...configData,
      effectiveDate: new Date(configData.effectiveDate) || new Date(),
      expirationDate: configData.expirationDate ? new Date(configData.expirationDate) : null
    });
    
    return res.status(201).json(newConfig);
  } catch (error) {
    logger.error('Error creating compensation configuration:', error);
    return res.status(500).json({ message: 'Failed to create compensation configuration' });
  }
};

/**
 * Update driver compensation configuration
 * @route PUT /api/driver/compensation/configuration/:id
 * @access Private (Admin only)
 */
const updateCompensationConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const configData = req.body;
    const user = await get_user_with_permissions(req);
    
    // Check if user has admin permission
    if (!user || !user.permissions.includes('admin')) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // Find the configuration
    const config = await DriverCompensationConfig.findByPk(id);
    
    if (!config) {
      return res.status(404).json({ message: 'Compensation configuration not found' });
    }
    
    // Update configuration
    await config.update({
      ...configData,
      effectiveDate: configData.effectiveDate ? new Date(configData.effectiveDate) : config.effectiveDate,
      expirationDate: configData.expirationDate ? new Date(configData.expirationDate) : config.expirationDate
    });
    
    return res.status(200).json(config);
  } catch (error) {
    logger.error(`Error updating compensation configuration ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to update compensation configuration' });
  }
};

module.exports = {
  calculateDriverEarnings,
  saveDriverEarnings,
  getDriverEarnings,
  processDriverPayment,
  calculateAllDriverEarnings,
  generateEarningsProjection,
  estimateDeliveryEarnings,
  getActiveCompensationConfig,
  createCompensationConfig,
  updateCompensationConfig,
  processBatchDriverPayments,
  createDriverConnectAccount
};
