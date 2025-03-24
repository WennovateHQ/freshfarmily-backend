/**
 * Main routes index file
 * 
 * Registers all API routes with the Express application
 */

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const productRoutes = require('./productRoutes');
const orderRoutes = require('./orderRoutes');
const deliveryRoutes = require('./deliveryRoutes');
const farmerRoutes = require('./farmerRoutes');
const farmRoutes = require('./farmRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const pricingRoutes = require('./pricingRoutes');
const driverCompensationRoutes = require('./driverCompensationRoutes');
const uploadRoutes = require('./uploadRoutes');
const settingsRoutes = require('./settingsRoutes');

// Register routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/farmers', farmerRoutes);
router.use('/farms', farmRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/pricing', pricingRoutes);
router.use('/driver', driverCompensationRoutes);
router.use('/upload', uploadRoutes);
router.use('/settings', settingsRoutes);

// API health check route
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
