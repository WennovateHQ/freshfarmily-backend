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
    allowNull: false,
    defaultValue: 0.00
  },
  proofOfDeliveryUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  customerSignature: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  handlingInstructions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  failureReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  review: {
    type: DataTypes.TEXT,
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
  tableName: 'deliveries',
  indexes: [
    {
      fields: ['orderId'],
      unique: true
    },
    {
      fields: ['driverId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['scheduledDeliveryTime']
    },
    {
      fields: ['deliveryZipCode']
    }
  ],
  hooks: {
    afterCreate: (delivery) => {
      logger.info(`Delivery created for order: ${delivery.orderId}`);
    },
    afterUpdate: (delivery) => {
      if (delivery.changed('status')) {
        logger.info(`Delivery status changed to ${delivery.status} for order: ${delivery.orderId}`);
      }
      if (delivery.changed('driverId')) {
        logger.info(`Delivery assigned to driver ID: ${delivery.driverId} for order: ${delivery.orderId}`);
      }
    }
  }
});

// Establish associations
const establishAssociations = () => {
  const { User } = require('./user');
  const { Order } = require('./order');
  
  // Delivery belongs to Order
  Delivery.belongsTo(Order, {
    foreignKey: 'orderId',
    onDelete: 'CASCADE'
  });
  
  // Delivery belongs to User (driver)
  Delivery.belongsTo(User, {
    foreignKey: 'driverId',
    as: 'Driver'
  });
  
  logger.debug('Delivery associations established');
};

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
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  accuracy: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  speed: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  heading: {
    type: DataTypes.FLOAT,
    allowNull: true
  }
}, {
  tableName: 'delivery_tracking',
  indexes: [
    {
      fields: ['deliveryId']
    },
    {
      fields: ['timestamp']
    }
  ]
});

// DeliveryTracking associations
DeliveryTracking.belongsTo(Delivery, {
  foreignKey: 'deliveryId',
  onDelete: 'CASCADE'
});

Delivery.hasMany(DeliveryTracking, {
  foreignKey: 'deliveryId',
  as: 'TrackingPoints'
});

// Export models and association setter
module.exports = {
  Delivery,
  DeliveryTracking,
  establishDeliveryAssociations: establishAssociations
};
