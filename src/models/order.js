/**
 * Order Model
 * 
 * Defines the order entity and related order item models for the FreshFarmily system
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

// Order model definition
const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.ENUM(
      'pending', 
      'confirmed', 
      'processing', 
      'ready', 
      'out_for_delivery',
      'delivered', 
      'picked_up',
      'cancelled',
      'refunded'
    ),
    defaultValue: 'pending'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  subTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  taxAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  deliveryFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  deliveryMethod: {
    type: DataTypes.ENUM('pickup', 'delivery'),
    allowNull: false,
    defaultValue: 'pickup'
  },
  deliveryAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deliveryCity: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deliveryState: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deliveryZipCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deliveryInstructions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  requestedDeliveryDate: {
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
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'card'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    defaultValue: 'pending'
  },
  paymentIntentId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isRated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
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
  tableName: 'orders',
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['orderNumber'],
      unique: true
    },
    {
      fields: ['status']
    },
    {
      fields: ['paymentStatus']
    },
    {
      fields: ['createdAt']
    }
  ],
  hooks: {
    beforeCreate: (order) => {
      // Generate order number if not provided
      if (!order.orderNumber) {
        const timestamp = new Date().getTime().toString().slice(-6);
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        order.orderNumber = `FF-${timestamp}-${random}`;
      }
      logger.info(`Creating new order: ${order.orderNumber}`);
    },
    afterUpdate: (order) => {
      if (order.changed('status')) {
        logger.info(`Order ${order.orderNumber} status changed to: ${order.status}`);
      }
      if (order.changed('paymentStatus')) {
        logger.info(`Order ${order.orderNumber} payment status changed to: ${order.paymentStatus}`);
      }
    }
  }
});

// OrderItem model for individual items in an order
const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  farmId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  productName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  farmName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  discountPercent: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'refunded'),
    defaultValue: 'pending'
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
  tableName: 'order_items',
  indexes: [
    {
      fields: ['orderId']
    },
    {
      fields: ['productId']
    },
    {
      fields: ['farmId']
    }
  ],
  hooks: {
    beforeCreate: (item) => {
      // Calculate total price if not provided
      if (!item.totalPrice) {
        item.totalPrice = parseFloat(item.unitPrice) * parseFloat(item.quantity);
      }
      
      // Calculate discount amount if not provided
      if (item.discountPercent > 0 && !item.discountAmount) {
        item.discountAmount = (parseFloat(item.totalPrice) * (item.discountPercent / 100)).toFixed(2);
      }
    }
  }
});

// Establish associations 
const establishAssociations = () => {
  const { User } = require('./user');
  const { Product } = require('./product');
  const { Farm } = require('./farm');
  const { Delivery } = require('./delivery');
  
  // Order belongs to User (consumer)
  Order.belongsTo(User, {
    foreignKey: 'userId',
    as: 'Customer'
  });
  
  // Order has many OrderItems
  Order.hasMany(OrderItem, {
    foreignKey: 'orderId',
    as: 'OrderItems',
    onDelete: 'CASCADE'
  });
  
  // OrderItem belongs to Order
  OrderItem.belongsTo(Order, {
    foreignKey: 'orderId'
  });
  
  // OrderItem belongs to Product
  OrderItem.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'OrderProduct'
  });
  
  // OrderItem belongs to Farm
  OrderItem.belongsTo(Farm, {
    foreignKey: 'farmId',
    as: 'Farm'
  });
  
  // Order has one Delivery
  Order.hasOne(Delivery, {
    foreignKey: 'orderId',
    as: 'OrderDelivery'
  });
  
  logger.debug('Order associations established');
};

// Export models and association setter
module.exports = {
  Order,
  OrderItem,
  establishOrderAssociations: establishAssociations
};
