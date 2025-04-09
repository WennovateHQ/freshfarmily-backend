/**
 * Migration: Create Deliveries Table
 * Date: 2025-03-14
 * 
 * This migration creates the Deliveries table which is required for
 * the delivery batch and route optimization features.
 */

const { DataTypes } = require('sequelize');

// Up Migration - Create Deliveries table
async function up(queryInterface, Sequelize) {
  console.log('Running migration to create Deliveries table');
  
  await queryInterface.createTable('Deliveries', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Orders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    driverId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    status: {
      type: DataTypes.ENUM(
        'pending', 
        'assigned', 
        'in_progress', 
        'completed', 
        'failed', 
        'cancelled'
      ),
      defaultValue: 'pending'
    },
    pickupAddress: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    deliveryAddress: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    pickupCoordinates: {
      type: DataTypes.GEOMETRY('POINT'),
      allowNull: true
    },
    deliveryCoordinates: {
      type: DataTypes.GEOMETRY('POINT'),
      allowNull: true
    },
    distanceKm: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    estimatedDuration: {
      type: DataTypes.INTEGER,  // In minutes
      allowNull: true
    },
    actualDuration: {
      type: DataTypes.INTEGER,  // In minutes
      allowNull: true
    },
    scheduledPickup: {
      type: DataTypes.DATE,
      allowNull: true
    },
    scheduledDelivery: {
      type: DataTypes.DATE,
      allowNull: true
    },
    actualPickup: {
      type: DataTypes.DATE,
      allowNull: true
    },
    actualDelivery: {
      type: DataTypes.DATE,
      allowNull: true
    },
    specialInstructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    recipientName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    recipientPhone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    deliveryFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    driverEarnings: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    proofOfDelivery: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    customerRating: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    driverRating: {
      type: DataTypes.INTEGER,
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

  // Add indexes for better query performance
  await queryInterface.addIndex('Deliveries', ['orderId']);
  await queryInterface.addIndex('Deliveries', ['driverId']);
  await queryInterface.addIndex('Deliveries', ['status']);
  await queryInterface.addIndex('Deliveries', ['scheduledDelivery']);

  console.log('Deliveries table migration completed successfully');
}

// Down Migration - Drop table
async function down(queryInterface, Sequelize) {
  console.log('Running rollback migration for Deliveries table');
  await queryInterface.dropTable('Deliveries');
}

module.exports = {
  up,
  down
};
