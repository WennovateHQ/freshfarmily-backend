/**
 * FreshFarmily Order Schema Migration
 * Date: 2025-03-26
 * 
 * This migration creates the necessary tables for the Order entity and the OrderItem model.
 */

const { DataTypes } = require('sequelize');

async function up(queryInterface, Sequelize) {
  console.log('Creating Order and OrderItem tables');

  // Create orders table
  await queryInterface.createTable('orders', {
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
      defaultValue: Sequelize.fn('NOW')
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    }
  }, {
    tableName: 'orders'
  });

  // Add indexes for orders table
  await queryInterface.addIndex('orders', ['userId']);
  await queryInterface.addIndex('orders', {
    fields: ['orderNumber'],
    unique: true
  });
  await queryInterface.addIndex('orders', ['status']);
  await queryInterface.addIndex('orders', ['paymentStatus']);
  await queryInterface.addIndex('orders', ['createdAt']);

  // Create order_items table
  await queryInterface.createTable('order_items', {
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
      defaultValue: Sequelize.fn('NOW')
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    }
  }, {
    tableName: 'order_items'
  });

  // Add indexes for order_items table
  await queryInterface.addIndex('order_items', ['orderId']);
  await queryInterface.addIndex('order_items', ['productId']);
  await queryInterface.addIndex('order_items', ['farmId']);

  console.log('Order and OrderItem tables created successfully');
}

async function down(queryInterface, Sequelize) {
  console.log('Dropping Order and OrderItem tables');

  await queryInterface.dropTable('order_items');
  await queryInterface.dropTable('orders');

  // Drop ENUM types for PostgreSQL if they exist
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_status";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_paymentStatus";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_order_items_status";');

  console.log('Rollback migration completed successfully');
}

module.exports = {
  up,
  down
};
