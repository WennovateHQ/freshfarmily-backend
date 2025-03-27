/**
 * FreshFarmily Delivery Schema Migration
 * Date: 2025-03-26
 * 
 * This migration creates all necessary tables for the FreshFarmily delivery system including:
 * - Delivery
 * - DeliveryBatch
 * - DeliveryTracking
 * - RouteOptimizationHistory
 */

const { DataTypes } = require('sequelize');

async function up(queryInterface, Sequelize) {
  console.log('Creating Delivery related tables');

  // Create Delivery table
  await queryInterface.createTable('deliveries', {
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
      type: Sequelize.ENUM(
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
      comment: 'Customer rating (1-5)'
    },
    driverRating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Driver rating (1-5)'
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
      type: DataTypes.STRING,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    }
  });

  // Create DeliveryBatch table
  await queryInterface.createTable('delivery_batches', {
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
      type: Sequelize.ENUM('active', 'completed', 'cancelled'),
      defaultValue: 'active'
    },
    routeData: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    deliveryCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Maximum 3 deliveries per batch'
    },
    startedAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
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
      comment: 'Driver rating for the batch (1-5)'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    }
  });

  // Create DeliveryTracking table
  await queryInterface.createTable('delivery_trackings', {
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
      type: DataTypes.FLOAT,
      allowNull: true
    },
    heading: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    },
    batteryLevel: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    accuracy: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: true
    }
  });

  // Create RouteOptimizationHistory table
  await queryInterface.createTable('route_optimization_histories', {
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
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Time taken for optimization in milliseconds'
    },
    distanceSaved: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Distance saved in kilometers'
    },
    timeSaved: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Time saved in minutes'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    }
  });

  console.log('Delivery related tables created successfully');
}

async function down(queryInterface, Sequelize) {
  console.log('Dropping Delivery related tables');

  await queryInterface.dropTable('route_optimization_histories');
  await queryInterface.dropTable('delivery_trackings');
  await queryInterface.dropTable('delivery_batches');
  await queryInterface.dropTable('deliveries');

  // Drop ENUM types for PostgreSQL if they exist
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_deliveries_status";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_delivery_batches_status";');

  console.log('Rollback migration completed successfully');
}

module.exports = {
  up,
  down
};
