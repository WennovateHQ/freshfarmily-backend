/**
 * Migration: Create Orders Table
 * Date: 2025-03-13
 * 
 * This migration creates the Orders table which is a dependency for
 * the Deliveries, DeliveryBatches, and RouteOptimizationHistory tables.
 */

const { DataTypes } = require('sequelize');

// Up Migration - Create Orders table
async function up(queryInterface, Sequelize) {
  console.log('Running migration to create Orders table');
  
  // First, check if Users table exists
  const [userTableResult] = await queryInterface.sequelize.query(
    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Users');"
  );
  
  const usersTableExists = userTableResult[0].exists;
  
  if (!usersTableExists) {
    console.log('Creating Users table as it is required for Orders');
    await queryInterface.createTable('Users', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      role: {
        type: DataTypes.ENUM('admin', 'farmer', 'driver', 'consumer'),
        defaultValue: 'consumer'
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true
      },
      address: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      stripeCustomerId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      stripeAccountId: {
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
    
    await queryInterface.addIndex('Users', ['email']);
    await queryInterface.addIndex('Users', ['role']);
    
    console.log('Users table created successfully');
  }
  
  // Now create Orders table
  await queryInterface.createTable('Orders', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    farmerId: {
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
      type: DataTypes.ENUM(
        'pending', 
        'processing', 
        'prepared',
        'out_for_delivery', 
        'delivered', 
        'cancelled'
      ),
      defaultValue: 'pending'
    },
    items: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    productSubtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    platformCommission: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    deliveryServiceFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    paymentProcessingFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    insuranceFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    finalTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    discounts: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'authorized', 'paid', 'refunded', 'failed'),
      defaultValue: 'pending'
    },
    paymentMethod: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    paymentIntentId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    billingAddress: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    shippingAddress: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    customerNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    estimatedDelivery: {
      type: DataTypes.DATE,
      allowNull: true
    },
    orderDate: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    },
    cancelReason: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isMembershipOrder: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    membershipBenefitsApplied: {
      type: DataTypes.JSONB,
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
  await queryInterface.addIndex('Orders', ['orderNumber']);
  await queryInterface.addIndex('Orders', ['customerId']);
  await queryInterface.addIndex('Orders', ['farmerId']);
  await queryInterface.addIndex('Orders', ['status']);
  await queryInterface.addIndex('Orders', ['paymentStatus']);
  await queryInterface.addIndex('Orders', ['orderDate']);

  console.log('Orders table migration completed successfully');
}

// Down Migration - Drop table
async function down(queryInterface, Sequelize) {
  console.log('Running rollback migration for Orders table');
  await queryInterface.dropTable('Orders');
  
  // We don't drop the Users table since other tables may depend on it
}

module.exports = {
  up,
  down
};
