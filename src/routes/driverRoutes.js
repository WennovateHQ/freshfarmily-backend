/**
 * Driver Routes
 * 
 * Specialized routes for driver management, batch operations, and route optimization
 * for the FreshFarmily system
 */

const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { authenticate, requireActiveUser, requirePermissions } = require('../middleware/auth');
const logger = require('../utils/logger');
const { Delivery, DeliveryBatch, RouteOptimizationHistory } = require('../models/delivery');
const { Order, OrderItem } = require('../models/order');
const { User } = require('../models/user');
const { Farm } = require('../models/farm');
const { Product } = require('../models/product');
const { sequelize } = require('../config/database');
const geolib = require('geolib');
const googleMapsService = require('../services/googleMapsService');

const router = express.Router();

/**
 * @route GET /api/drivers/available-deliveries
 * @description Get deliveries available for a driver to claim
 * @access Private (drivers only)
 */
router.get('/available-deliveries', [
  authenticate,
  requireActiveUser,
  requirePermissions(['update_delivery']),
  query('maxDistance').optional().isFloat({ min: 0 }).withMessage('Max distance must be a positive number'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'driver') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only drivers can access this endpoint'
      });
    }

    // Get driver's current location (from profile or query)
    const driver = await User.findByPk(req.user.userId);
    
    // Default to driver's base location if not provided
    const driverLat = parseFloat(req.query.lat) || driver.latitude;
    const driverLng = parseFloat(req.query.lng) || driver.longitude;
    
    if (!driverLat || !driverLng) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Driver location not available. Please update your profile or provide lat/lng parameters'
      });
    }
    
    // Build pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Get unassigned deliveries
    const deliveries = await Delivery.findAll({
      where: {
        status: 'pending',
        driverId: null
      },
      include: [
        {
          model: Order,
          include: [
            {
              model: OrderItem,
              as: 'Items',
              include: [
                {
                  model: Product,
                  include: [
                    {
                      model: Farm,
                      include: [
                        {
                          model: User,
                          as: 'Farmer',
                          attributes: ['id', 'firstName', 'lastName']
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              model: User,
              as: 'Consumer',
              attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'latitude', 'longitude']
            }
          ]
        }
      ]
    });
    
    // Calculate distances and filter by max distance if provided
    const maxDistance = parseFloat(req.query.maxDistance) || Infinity;
    
    const deliveriesWithDistance = deliveries.map(delivery => {
      // For each delivery, calculate:
      // 1. Distance from driver to farm(s)
      // 2. Distance from farm(s) to customer
      // 3. Total route distance
      
      // Get unique farms in this order
      const farmsInOrder = new Map();
      delivery.Order.Items.forEach(item => {
        const farm = item.Product.Farm;
        if (!farmsInOrder.has(farm.id)) {
          farmsInOrder.set(farm.id, {
            id: farm.id,
            name: farm.name,
            latitude: farm.latitude,
            longitude: farm.longitude,
            address: farm.address
          });
        }
      });
      
      const farms = Array.from(farmsInOrder.values());
      
      // Get customer location
      const customerLat = delivery.Order.Consumer.latitude;
      const customerLng = delivery.Order.Consumer.longitude;
      
      // If we don't have coordinates, use addresses to estimate distances
      let totalDistance = 0;
      let routePoints = [];
      
      if (farms.length > 0 && customerLat && customerLng) {
        // Start at driver location
        routePoints.push({
          latitude: driverLat,
          longitude: driverLng,
          type: 'driver',
          name: 'Your Location'
        });
        
        // Add farm pickup points
        farms.forEach(farm => {
          if (farm.latitude && farm.longitude) {
            routePoints.push({
              latitude: farm.latitude,
              longitude: farm.longitude,
              type: 'farm',
              name: farm.name,
              id: farm.id
            });
          }
        });
        
        // Add customer delivery point
        routePoints.push({
          latitude: customerLat,
          longitude: customerLng,
          type: 'customer',
          name: `${delivery.Order.Consumer.firstName} ${delivery.Order.Consumer.lastName}`,
          id: delivery.Order.Consumer.id
        });
        
        // Calculate total route distance (simple sequential path)
        for (let i = 0; i < routePoints.length - 1; i++) {
          const distance = geolib.getDistance(
            { latitude: routePoints[i].latitude, longitude: routePoints[i].longitude },
            { latitude: routePoints[i+1].latitude, longitude: routePoints[i+1].longitude }
          );
          totalDistance += distance;
        }
        
        // Convert from meters to kilometers
        totalDistance = totalDistance / 1000;
      }
      
      return {
        delivery: {
          id: delivery.id,
          status: delivery.status,
          scheduledDeliveryTime: delivery.scheduledDeliveryTime,
          scheduledPickupTime: delivery.scheduledPickupTime || null,
          deliveryAddress: `${delivery.deliveryAddress}, ${delivery.deliveryCity}, ${delivery.deliveryState} ${delivery.deliveryZipCode}`
        },
        order: {
          id: delivery.Order.id,
          orderNumber: delivery.Order.orderNumber,
          totalAmount: delivery.Order.totalAmount,
          items: delivery.Order.Items.length
        },
        customer: {
          name: `${delivery.Order.Consumer.firstName} ${delivery.Order.Consumer.lastName}`,
          phoneNumber: delivery.Order.Consumer.phoneNumber
        },
        farms: farms,
        distanceDetails: {
          totalDistanceKm: totalDistance,
          routePoints: routePoints
        }
      };
    }).filter(delivery => {
      // Filter by max distance if provided
      return delivery.distanceDetails.totalDistanceKm <= maxDistance;
    });
    
    // Sort by distance
    deliveriesWithDistance.sort((a, b) => {
      return a.distanceDetails.totalDistanceKm - b.distanceDetails.totalDistanceKm;
    });
    
    // Apply pagination
    const paginatedDeliveries = deliveriesWithDistance.slice(offset, offset + limit);
    
    return res.status(200).json({
      availableDeliveries: paginatedDeliveries,
      totalCount: deliveriesWithDistance.length,
      totalPages: Math.ceil(deliveriesWithDistance.length / limit),
      currentPage: page
    });
  } catch (error) {
    logger.error(`Error fetching available deliveries: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve available deliveries'
    });
  }
});

/**
 * @route POST /api/drivers/batch-create
 * @description Create a batch of deliveries for a driver
 * @access Private (drivers only)
 */
router.post('/batch-create', [
  authenticate,
  requireActiveUser,
  requirePermissions(['update_delivery']),
  body('deliveryIds').isArray({ min: 1, max: 3 }).withMessage('Batch must contain between 1 and 3 deliveries'),
  body('deliveryIds.*').isUUID().withMessage('Invalid delivery ID'),
  body('optimizedRoute').optional().isBoolean().withMessage('optimizedRoute must be a boolean')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'driver') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only drivers can access this endpoint'
      });
    }

    const { deliveryIds, optimizedRoute = true } = req.body;
    
    // Verify deliveries exist and are unassigned
    const deliveries = await Delivery.findAll({
      where: {
        id: deliveryIds,
        status: 'pending',
        driverId: null
      },
      include: [
        {
          model: Order,
          include: [
            {
              model: OrderItem,
              as: 'Items',
              include: [
                {
                  model: Product,
                  include: [{ model: Farm }]
                }
              ]
            },
            { model: User, as: 'Consumer' }
          ]
        }
      ]
    });
    
    if (deliveries.length !== deliveryIds.length) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'One or more deliveries are already assigned or do not exist'
      });
    }
    
    // Make sure batch size doesn't exceed 3
    const currentDeliveryCount = await Delivery.count({
      where: {
        driverId: req.user.userId,
        status: ['assigned', 'in_progress']
      }
    });
    
    if (currentDeliveryCount + deliveries.length > 3) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `You can only have a maximum of 3 active deliveries. You currently have ${currentDeliveryCount}.`
      });
    }
    
    // Start a transaction
    const result = await sequelize.transaction(async (t) => {
      // Generate route data for this batch
      let routeData = {
        driverId: req.user.userId,
        deliveryIds: deliveryIds,
        optimized: optimizedRoute,
        createdAt: new Date(),
        stops: []
      };
      
      // Assign all deliveries to this driver
      for (const delivery of deliveries) {
        // Add farm pickups
        const uniqueFarms = new Map();
        delivery.Order.Items.forEach(item => {
          const farm = item.Product.Farm;
          uniqueFarms.set(farm.id, {
            id: farm.id,
            name: farm.name,
            latitude: farm.latitude,
            longitude: farm.longitude,
            address: farm.address,
            type: 'pickup'
          });
        });
        
        // Add stops to the route
        Array.from(uniqueFarms.values()).forEach(farm => {
          routeData.stops.push({
            type: 'pickup',
            farmId: farm.id,
            farmName: farm.name,
            latitude: farm.latitude,
            longitude: farm.longitude,
            address: farm.address,
            orderId: delivery.Order.id,
            orderNumber: delivery.Order.orderNumber
          });
        });
        
        // Add customer stop
        routeData.stops.push({
          type: 'delivery',
          customerId: delivery.Order.Consumer.id,
          customerName: `${delivery.Order.Consumer.firstName} ${delivery.Order.Consumer.lastName}`,
          latitude: delivery.Order.Consumer.latitude,
          longitude: delivery.Order.Consumer.longitude,
          address: `${delivery.deliveryAddress}, ${delivery.deliveryCity}, ${delivery.deliveryState} ${delivery.deliveryZipCode}`,
          orderId: delivery.Order.id,
          orderNumber: delivery.Order.orderNumber,
          deliveryId: delivery.id
        });
        
        // Update delivery status
        await delivery.update({
          driverId: req.user.userId,
          status: 'assigned',
          batchId: routeData.batchId
        }, { transaction: t });
      }
      
      // Optimize route if requested
      if (optimizedRoute) {
        routeData = optimizeRoute(routeData);
      }
      
      // Create batch record in database
      const { DeliveryBatch } = require('../models/delivery');
      const batch = await DeliveryBatch.create({
        driverId: req.user.userId,
        routeData: routeData,
        status: 'active',
        deliveryCount: deliveries.length
      }, { transaction: t });
      
      // Update all deliveries with the batch ID
      await Delivery.update(
        { batchId: batch.id },
        { 
          where: { id: deliveryIds },
          transaction: t
        }
      );
      
      return { batch, deliveries };
    });
    
    return res.status(201).json({
      message: 'Batch created successfully',
      batch: result.batch,
      deliveries: result.deliveries.map(d => ({
        id: d.id,
        status: 'assigned',
        orderId: d.Order.id,
        orderNumber: d.Order.orderNumber
      })),
      route: result.batch.routeData
    });
  } catch (error) {
    logger.error(`Error creating delivery batch: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create delivery batch'
    });
  }
});

/**
 * @route POST /api/drivers/optimize-route
 * @description Optimize delivery route for a batch
 * @access Private (drivers only)
 */
router.post('/optimize-route', [
  authenticate,
  requireActiveUser,
  requirePermissions(['update_delivery']),
  body('batchId').isUUID().withMessage('Valid batch ID is required'),
  body('strategy').optional().isIn(['fastest', 'shortest', 'balanced']).withMessage('Strategy must be fastest, shortest, or balanced'),
  body('currentLocation').optional().isObject().withMessage('Current location must be an object'),
  body('currentLocation.latitude').optional().isFloat().withMessage('Latitude must be a valid number'),
  body('currentLocation.longitude').optional().isFloat().withMessage('Longitude must be a valid number')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { batchId, strategy = 'balanced', currentLocation } = req.body;
    const driverId = req.user.userId;

    // Find the batch and all its deliveries
    const batch = await DeliveryBatch.findOne({
      where: {
        id: batchId,
        driverId,
        status: 'active'
      },
      include: [
        {
          model: Delivery,
          as: 'Deliveries',
          include: [
            {
              model: Order,
              include: [
                { 
                  model: User, 
                  as: 'Consumer',
                  attributes: ['id', 'firstName', 'lastName', 'latitude', 'longitude']
                }
              ]
            }
          ]
        }
      ]
    });

    if (!batch) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Batch not found or not active'
      });
    }

    if (batch.Deliveries.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Batch has no deliveries to optimize'
      });
    }

    // Get driver's current location
    let driverLocation;
    if (currentLocation && currentLocation.latitude && currentLocation.longitude) {
      driverLocation = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      };
    } else {
      const driver = await User.findByPk(driverId);
      driverLocation = {
        latitude: driver.latitude,
        longitude: driver.longitude
      };
    }

    // Extract delivery points for optimization
    const deliveryPoints = batch.Deliveries.map(delivery => {
      return {
        id: delivery.id,
        orderId: delivery.orderId,
        status: delivery.status,
        latitude: delivery.deliveryLatitude,
        longitude: delivery.deliveryLongitude,
        address: `${delivery.deliveryAddress}, ${delivery.deliveryCity}, ${delivery.deliveryState} ${delivery.deliveryZipCode}`,
        customerName: delivery.Order.Consumer ? `${delivery.Order.Consumer.firstName} ${delivery.Order.Consumer.lastName}` : 'Unknown'
      };
    });

    // Store the original route for optimization history
    const originalRoute = {
      points: deliveryPoints,
      driverLocation
    };

    // Use Google Maps for production, or geolib as fallback
    let optimizedRouteData;
    try {
      // Try Google Maps API first for more accurate optimization
      optimizedRouteData = await googleMapsService.optimizeDeliveryRoute(
        driverLocation,
        deliveryPoints,
        strategy
      );
      
      logger.info(`Route optimized using Google Maps API for batch ${batchId}`);
    } catch (error) {
      // Fall back to local optimization if Google Maps fails
      logger.warn(`Google Maps optimization failed, using fallback: ${error.message}`);
      optimizedRouteData = optimizeRoute(deliveryPoints, driverLocation, strategy);
    }

    // Save the optimization history
    const routeOptimization = await RouteOptimizationHistory.create({
      batchId,
      driverId,
      previousRoute: originalRoute,
      optimizedRoute: optimizedRouteData,
      optimizationStrategy: strategy,
      optimizationTime: Date.now(),
      distanceSaved: optimizedRouteData.distanceSaved,
      timeSaved: optimizedRouteData.timeSaved
    });

    // Update the batch with new route data
    await batch.update({
      routeData: optimizedRouteData,
      optimizationStrategy: strategy,
      totalDistance: optimizedRouteData.totalDistance,
      estimatedDuration: optimizedRouteData.totalDuration
    });

    return res.status(200).json({
      message: 'Route optimized successfully',
      batchId,
      optimizationId: routeOptimization.id,
      route: optimizedRouteData
    });
  } catch (error) {
    logger.error(`Error optimizing route: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to optimize delivery route'
    });
  }
});

/**
 * @route GET /api/drivers/active-batches
 * @description Get driver's active delivery batches
 * @access Private (drivers only)
 */
router.get('/active-batches', [
  authenticate,
  requireActiveUser,
  requirePermissions(['update_delivery'])
], async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only drivers can access this endpoint'
      });
    }

    // Get driver's active batches
    const { DeliveryBatch } = require('../models/delivery');
    const batches = await DeliveryBatch.findAll({
      where: {
        driverId: req.user.userId,
        status: 'active'
      },
      include: [
        {
          model: Delivery,
          as: 'Deliveries',
          include: [
            {
              model: Order,
              include: [
                { model: User, as: 'Consumer' }
              ]
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    if (batches.length === 0) {
      return res.status(200).json({
        message: 'No active batches found',
        batches: []
      });
    }
    
    return res.status(200).json({
      batches: batches.map(batch => ({
        id: batch.id,
        status: batch.status,
        createdAt: batch.createdAt,
        deliveryCount: batch.deliveryCount,
        route: batch.routeData,
        deliveries: batch.Deliveries.map(delivery => ({
          id: delivery.id,
          status: delivery.status,
          customerName: `${delivery.Order.Consumer.firstName} ${delivery.Order.Consumer.lastName}`,
          address: `${delivery.deliveryAddress}, ${delivery.deliveryCity}, ${delivery.deliveryState} ${delivery.deliveryZipCode}`,
          scheduledDeliveryTime: delivery.scheduledDeliveryTime,
          orderId: delivery.Order.id,
          orderNumber: delivery.Order.orderNumber
        }))
      }))
    });
  } catch (error) {
    logger.error(`Error fetching active batches: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve active batches'
    });
  }
});

/**
 * @route PUT /api/drivers/update-batch-progress/:batchId
 * @description Update the progress of a batch
 * @access Private (drivers only)
 */
router.put('/update-batch-progress/:batchId', [
  authenticate,
  requireActiveUser,
  requirePermissions(['update_delivery']),
  param('batchId').isUUID().withMessage('Invalid batch ID'),
  body('deliveryId').isUUID().withMessage('Invalid delivery ID'),
  body('status').isIn(['in_progress', 'completed']).withMessage('Invalid status'),
  body('currentLocation').optional().isObject().withMessage('Current location must be an object'),
  body('currentLocation.latitude').optional().isFloat().withMessage('Latitude must be a number'),
  body('currentLocation.longitude').optional().isFloat().withMessage('Longitude must be a number'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'driver') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only drivers can access this endpoint'
      });
    }

    const { deliveryId, status, currentLocation, notes } = req.body;
    
    // Get the batch and verify ownership
    const { DeliveryBatch } = require('../models/delivery');
    const batch = await DeliveryBatch.findOne({
      where: {
        id: req.params.batchId,
        driverId: req.user.userId,
        status: 'active'
      },
      include: [
        {
          model: Delivery,
          as: 'Deliveries'
        }
      ]
    });
    
    if (!batch) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Batch not found or not active'
      });
    }
    
    // Verify the delivery belongs to this batch
    const delivery = batch.Deliveries.find(d => d.id === deliveryId);
    if (!delivery) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Delivery does not belong to this batch'
      });
    }
    
    // Update delivery status
    await delivery.update({
      status,
      actualDeliveryTime: status === 'completed' ? new Date() : null,
      driverNotes: notes || delivery.driverNotes
    });
    
    // If driver provided location, update it
    if (currentLocation && currentLocation.latitude && currentLocation.longitude) {
      await User.update(
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          lastLocationUpdate: new Date()
        },
        { where: { id: req.user.userId } }
      );
    }
    
    // Check if all deliveries in batch are completed
    const allCompleted = (await Delivery.findAll({
      where: {
        batchId: batch.id
      }
    })).every(d => d.status === 'completed');
    
    if (allCompleted) {
      await batch.update({
        status: 'completed',
        completedAt: new Date()
      });
    }
    
    return res.status(200).json({
      message: `Delivery status updated to ${status}`,
      batchCompleted: allCompleted
    });
  } catch (error) {
    logger.error(`Error updating batch progress: ${error.message}`);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update batch progress'
    });
  }
});

// Helper function for route optimization (fallback if Google Maps API fails)
function optimizeRoute(deliveryPoints, driverLocation, strategy = 'balanced') {
  // Keep the existing optimizeRoute implementation as a fallback
  // This function will be used when Google Maps API is unavailable
  
  // Start with the driver's location
  let currentLocation = driverLocation;
  let remainingPoints = [...deliveryPoints];
  let route = [];
  let totalDistance = 0;
  
  // Simple nearest neighbor algorithm
  while (remainingPoints.length > 0) {
    let nextPointIndex = 0;
    let shortestDistance = Infinity;
    
    // Find the closest point to the current location
    remainingPoints.forEach((point, index) => {
      const distance = geolib.getDistance(
        { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
        { latitude: point.latitude, longitude: point.longitude }
      );
      
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nextPointIndex = index;
      }
    });
    
    // Add the closest point to the route
    const nextPoint = remainingPoints[nextPointIndex];
    route.push(nextPoint);
    totalDistance += shortestDistance;
    
    // Update current location and remove the point from remaining points
    currentLocation = nextPoint;
    remainingPoints.splice(nextPointIndex, 1);
  }
  
  // Estimate time based on average speed (30 km/h for urban delivery)
  const totalDistanceKm = totalDistance / 1000;
  const estimatedDuration = Math.round(totalDistanceKm * 2); // 2 minutes per km as a rough estimate
  
  return {
    optimizedRoute: [driverLocation, ...route],
    totalDistance: totalDistanceKm,
    totalDuration: estimatedDuration,
    points: route.map(point => ({
      id: point.id,
      latitude: point.latitude,
      longitude: point.longitude,
      address: point.address,
      customerName: point.customerName
    }))
  };
}

module.exports = router;
