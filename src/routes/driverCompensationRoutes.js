/**
 * Driver Compensation Routes
 * 
 * API routes for driver compensation functionality including:
 * - Earnings calculation and retrieval
 * - Payment processing
 * - Compensation configuration management
 */

const express = require('express');
const router = express.Router();
const driverCompensationController = require('../controllers/driverCompensationController');
const { authenticateJWT, requirePermission } = require('../middleware/auth');

// All routes require basic authentication
router.use(authenticateJWT);

// Routes for accessing driver's own earnings or admin accessing any driver
router.post('/earnings/calculate', driverCompensationController.calculateDriverEarnings);
router.get('/earnings/:driverId', driverCompensationController.getDriverEarnings);
router.post('/earnings/projection/:driverId', driverCompensationController.generateEarningsProjection);

// Driver-only route for estimating earnings before accepting an order
router.post('/earnings/estimate', 
  requirePermission('update_delivery'), 
  driverCompensationController.estimateDeliveryEarnings
);

// Connect account creation (driver can create their own, admin can create for any)
router.post('/connect-account', driverCompensationController.createDriverConnectAccount);

// Admin-only routes
router.post('/earnings', 
  requirePermission('admin'), 
  driverCompensationController.saveDriverEarnings
);

router.post('/earnings/:earningsId/process', 
  requirePermission('admin'), 
  driverCompensationController.processDriverPayment
);

router.post('/earnings/process-batch', 
  requirePermission('admin'), 
  driverCompensationController.processBatchDriverPayments
);

router.post('/earnings/calculateAll', 
  requirePermission('admin'), 
  driverCompensationController.calculateAllDriverEarnings
);

router.get('/compensation/configuration', 
  requirePermission('admin'), 
  driverCompensationController.getActiveCompensationConfig
);

router.post('/compensation/configuration', 
  requirePermission('admin'), 
  driverCompensationController.createCompensationConfig
);

router.put('/compensation/configuration/:id', 
  requirePermission('admin'), 
  driverCompensationController.updateCompensationConfig
);

module.exports = router;
