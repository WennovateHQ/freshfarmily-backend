/**
 * Delivery Model
 * 
 * Defines the delivery entity for the FreshFarmily system
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

// Delivery model definition
const Delivery = sequelize.define('Delivery', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true
  },
  driverId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  batchId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM(
      'pending',
      'assigned',
      'picked_up',
      'in_transit',
      'delivered',
      'failed',
      'cancelled'
    ),
    defaultValue: 'pending'
  },
  scheduledPickupTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actualPickupTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  scheduledDeliveryTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actualDeliveryTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  pickupLocation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pickupLatitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  pickupLongitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  deliveryAddress: {
    type: DataTypes.STRING,
    allowNull: false
  },
  deliveryCity: {
    type: DataTypes.STRING,
    allowNull: false
  },
  deliveryState: {
    type: DataTypes.STRING,
    allowNull: false
  },
  deliveryZipCode: {
    type: DataTypes.STRING,
    allowNull: false
  },
  deliveryLatitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  deliveryLongitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  deliveryInstructions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  estimatedDistance: {
    type: DataTypes.FLOAT, // in miles
    allowNull: true
  },
  actualDistance: {
    type: DataTypes.FLOAT, // in miles
    allowNull: true
  },
  deliveryFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  customerRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  driverRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  customerFeedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  driverFeedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  driverNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  deliveryProof: {
    type: DataTypes.STRING, // URL to delivery proof image
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  hooks: {
    afterCreate: async (delivery) => {
      logger.info(`New delivery created: ${delivery.id} for order ${delivery.orderId}`);
    },
    afterUpdate: async (delivery) => {
      if (delivery.changed('status')) {
        logger.info(`Delivery ${delivery.id} status updated to ${delivery.status}`);
      }
    }
  }
});

// Create DeliveryBatch model for managing batched deliveries
const DeliveryBatch = sequelize.define('DeliveryBatch', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  driverId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'cancelled'),
    defaultValue: 'active'
  },
  routeData: {
    type: DataTypes.JSONB, // Store optimized route data
    allowNull: false,
    defaultValue: {}
  },
  deliveryCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      max: 3 // Maximum 3 deliveries per batch
    }
  },
  startedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  totalDistance: {
    type: DataTypes.FLOAT, // in kilometers
    allowNull: true
  },
  estimatedDuration: {
    type: DataTypes.INTEGER, // in minutes
    allowNull: true
  },
  actualDuration: {
    type: DataTypes.INTEGER, // in minutes
    allowNull: true
  },
  optimizationStrategy: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'balanced'
  },
  routeEfficiencyScore: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  driverRating: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  hooks: {
    afterCreate: async (batch) => {
      logger.info(`New delivery batch created: ${batch.id} for driver ${batch.driverId} with ${batch.deliveryCount} deliveries`);
    },
    afterUpdate: async (batch) => {
      if (batch.changed('status')) {
        logger.info(`Delivery batch ${batch.id} status updated to ${batch.status}`);
      }
    }
  }
});

// Create DeliveryTracking model for real-time tracking
const DeliveryTracking = sequelize.define('DeliveryTracking', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  deliveryId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  driverId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  speed: {
    type: DataTypes.FLOAT, // in km/h
    allowNull: true
  },
  heading: {
    type: DataTypes.FLOAT, // in degrees
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  batteryLevel: {
    type: DataTypes.FLOAT, // percentage
    allowNull: true
  },
  accuracy: {
    type: DataTypes.FLOAT, // in meters
    allowNull: true
  },
  provider: {
    type: DataTypes.STRING, // GPS, Network, etc.
    allowNull: true
  }
});

// Create RouteOptimizationHistory model for tracking route optimizations
const RouteOptimizationHistory = sequelize.define('RouteOptimizationHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  batchId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  driverId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  previousRoute: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  optimizedRoute: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  optimizationStrategy: {
    type: DataTypes.STRING,
    allowNull: false
  },
  optimizationTime: {
    type: DataTypes.INTEGER, // in milliseconds
    allowNull: true
  },
  distanceSaved: {
    type: DataTypes.FLOAT, // in kilometers
    allowNull: true
  },
  timeSaved: {
    type: DataTypes.INTEGER, // in minutes
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Establish associations
function establishAssociations() {
  const { Order } = require('./order');
  const { User } = require('./user');

  // Order has one Delivery
  Order.hasOne(Delivery, { foreignKey: 'orderId' });
  Delivery.belongsTo(Order, { foreignKey: 'orderId' });

  // Driver (User) has many Deliveries
  User.hasMany(Delivery, { foreignKey: 'driverId', as: 'Deliveries' });
  Delivery.belongsTo(User, { foreignKey: 'driverId', as: 'Driver' });
  
  // Driver has many DeliveryBatches
  User.hasMany(DeliveryBatch, { foreignKey: 'driverId', as: 'DeliveryBatches' });
  DeliveryBatch.belongsTo(User, { foreignKey: 'driverId', as: 'Driver' });
  
  // DeliveryBatch has many Deliveries
  DeliveryBatch.hasMany(Delivery, { foreignKey: 'batchId', as: 'Deliveries' });
  Delivery.belongsTo(DeliveryBatch, { foreignKey: 'batchId', as: 'Batch' });
  
  // Delivery has many DeliveryTracking records
  Delivery.hasMany(DeliveryTracking, { foreignKey: 'deliveryId', as: 'TrackingRecords' });
  DeliveryTracking.belongsTo(Delivery, { foreignKey: 'deliveryId' });
  
  // DeliveryBatch has many RouteOptimizationHistory records
  DeliveryBatch.hasMany(RouteOptimizationHistory, { foreignKey: 'batchId', as: 'OptimizationHistory' });
  RouteOptimizationHistory.belongsTo(DeliveryBatch, { foreignKey: 'batchId' });
}

// Call this function from models/index.js
module.exports = {
  Delivery,
  DeliveryTracking,
  DeliveryBatch,
  RouteOptimizationHistory,
  establishAssociations
};
