/**
 * Migration: Create DeliveryBatch and RouteOptimizationHistory Tables
 * Date: 2025-03-15
 * 
 * This migration creates the necessary tables for batch management and route optimization
 * features in the FreshFarmily delivery system.
 */

const { DataTypes } = require('sequelize');

// Up Migration - Create tables
async function up(queryInterface, Sequelize) {
  console.log('Running migration to create Delivery Batch and Route Optimization tables');
  
  // Create DeliveryBatch table
  await queryInterface.createTable('DeliveryBatches', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    driverId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'cancelled'),
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
      defaultValue: 0
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
      type: DataTypes.FLOAT,
      allowNull: true
    },
    estimatedDuration: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    actualDuration: {
      type: DataTypes.INTEGER,
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

  // Create RouteOptimizationHistory table
  await queryInterface.createTable('RouteOptimizationHistories', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    batchId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'DeliveryBatches',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    driverId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
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
      allowNull: true
    },
    distanceSaved: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    timeSaved: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    }
  });

  // Add batchId to Deliveries table
  await queryInterface.addColumn('Deliveries', 'batchId', {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'DeliveryBatches',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  });

  // Add indexes for better query performance
  await queryInterface.addIndex('DeliveryBatches', ['driverId']);
  await queryInterface.addIndex('DeliveryBatches', ['status']);
  await queryInterface.addIndex('RouteOptimizationHistories', ['batchId']);
  await queryInterface.addIndex('RouteOptimizationHistories', ['driverId']);
  await queryInterface.addIndex('Deliveries', ['batchId']);

  console.log('Migration completed successfully');
}

// Down Migration - Drop tables
async function down(queryInterface, Sequelize) {
  console.log('Running rollback migration');
  
  // Remove foreign key column first
  await queryInterface.removeColumn('Deliveries', 'batchId');
  
  // Drop tables in reverse order
  await queryInterface.dropTable('RouteOptimizationHistories');
  await queryInterface.dropTable('DeliveryBatches');

  console.log('Rollback migration completed successfully');
}

module.exports = {
  up,
  down
};
