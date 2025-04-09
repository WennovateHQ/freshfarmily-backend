/**
 * FreshFarmily Complete Database Schema Migration
 * Date: 2025-03-15
 * 
 * This combined migration creates all necessary tables for the FreshFarmily application
 * in the correct dependency order:
 * 1. Users (base table)
 * 2. Memberships (depends on Users)
 * 3. Orders (depends on Users)
 * 4. Deliveries (depends on Orders and Users)
 * 5. DeliveryBatches (depends on Users)
 * 6. RouteOptimizationHistories (depends on DeliveryBatches and Users)
 * 7. DriverCompensationConfig
 * 8. DriverEarnings
 */

const { DataTypes } = require('sequelize');

// Up Migration - Create all tables in dependency order
async function up(queryInterface, Sequelize) {
  console.log('Running complete schema migration for FreshFarmily');

  // 1. Create Users table
  console.log('Creating Users table...');
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
  }).catch(error => {
    // Skip if table already exists
    if (!error.message.includes('already exists')) {
      throw error;
    }
    console.log('Users table already exists, skipping...');
  });
  
  // Add indexes to Users table
  try {
    await queryInterface.addIndex('Users', ['email']);
    await queryInterface.addIndex('Users', ['role']);
  } catch (error) {
    // Skip if indexes already exist
    if (!error.message.includes('already exists')) {
      console.warn('Warning when adding user indexes:', error.message);
    }
  }

  // 2. Create Memberships table
  console.log('Creating Memberships table...');
  await queryInterface.createTable('Memberships', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    tier: {
      type: DataTypes.ENUM('free', 'premium'),
      defaultValue: 'free'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'canceled', 'expired'),
      defaultValue: 'active'
    },
    startDate: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    subscriptionId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paymentMethodId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    autoRenew: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    }
  }).catch(error => {
    // Skip if table already exists
    if (!error.message.includes('already exists')) {
      throw error;
    }
    console.log('Memberships table already exists, skipping...');
  });
  
  // Add indexes to Memberships
  try {
    await queryInterface.addIndex('Memberships', ['userId']);
    await queryInterface.addIndex('Memberships', ['status']);
    await queryInterface.addIndex('Memberships', ['endDate']);
  } catch (error) {
    if (!error.message.includes('already exists')) {
      console.warn('Warning when adding membership indexes:', error.message);
    }
  }

  // 3. Create Orders table
  console.log('Creating Orders table...');
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
  }).catch(error => {
    // Skip if table already exists
    if (!error.message.includes('already exists')) {
      throw error;
    }
    console.log('Orders table already exists, skipping...');
  });

  // Add indexes to Orders
  try {
    await queryInterface.addIndex('Orders', ['orderNumber']);
    await queryInterface.addIndex('Orders', ['customerId']);
    await queryInterface.addIndex('Orders', ['farmerId']);
    await queryInterface.addIndex('Orders', ['status']);
    await queryInterface.addIndex('Orders', ['paymentStatus']);
    await queryInterface.addIndex('Orders', ['orderDate']);
  } catch (error) {
    if (!error.message.includes('already exists')) {
      console.warn('Warning when adding order indexes:', error.message);
    }
  }

  // 4. Create Deliveries table
  console.log('Creating Deliveries table...');
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
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'JSON object with lat and lng fields for pickup location'
    },
    deliveryCoordinates: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'JSON object with lat and lng fields for delivery location'
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
  }).catch(error => {
    // Skip if table already exists
    if (!error.message.includes('already exists')) {
      throw error;
    }
    console.log('Deliveries table already exists, skipping...');
  });

  // Add indexes to Deliveries
  try {
    await queryInterface.addIndex('Deliveries', ['orderId']);
    await queryInterface.addIndex('Deliveries', ['driverId']);
    await queryInterface.addIndex('Deliveries', ['status']);
    await queryInterface.addIndex('Deliveries', ['scheduledDelivery']);
  } catch (error) {
    if (!error.message.includes('already exists')) {
      console.warn('Warning when adding delivery indexes:', error.message);
    }
  }

  // 5. Create DeliveryBatches table
  console.log('Creating DeliveryBatches table...');
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
  }).catch(error => {
    // Skip if table already exists
    if (!error.message.includes('already exists')) {
      throw error;
    }
    console.log('DeliveryBatches table already exists, skipping...');
  });

  // Add indexes to DeliveryBatches
  try {
    await queryInterface.addIndex('DeliveryBatches', ['driverId']);
    await queryInterface.addIndex('DeliveryBatches', ['status']);
  } catch (error) {
    if (!error.message.includes('already exists')) {
      console.warn('Warning when adding delivery batch indexes:', error.message);
    }
  }

  // 6. Create RouteOptimizationHistories table
  console.log('Creating RouteOptimizationHistories table...');
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
  }).catch(error => {
    // Skip if table already exists
    if (!error.message.includes('already exists')) {
      throw error;
    }
    console.log('RouteOptimizationHistories table already exists, skipping...');
  });

  // Add indexes to RouteOptimizationHistories
  try {
    await queryInterface.addIndex('RouteOptimizationHistories', ['batchId']);
    await queryInterface.addIndex('RouteOptimizationHistories', ['driverId']);
  } catch (error) {
    if (!error.message.includes('already exists')) {
      console.warn('Warning when adding route optimization indexes:', error.message);
    }
  }

  // 7. Add batchId to Deliveries table if not exists
  try {
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
    console.log('Added batchId column to Deliveries table');
  } catch (error) {
    // Skip if column already exists
    if (!error.message.includes('already exists')) {
      console.warn('Warning when adding batchId to Deliveries:', error.message);
    } else {
      console.log('batchId column already exists in Deliveries table, skipping...');
    }
  }

  // Add index for batchId in Deliveries
  try {
    await queryInterface.addIndex('Deliveries', ['batchId']);
  } catch (error) {
    if (!error.message.includes('already exists')) {
      console.warn('Warning when adding batchId index:', error.message);
    }
  }

  // 8. Create DriverCompensationConfig table
  console.log('Creating DriverCompensationConfig table...');
  await queryInterface.createTable('DriverCompensationConfigs', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    baseHourlyRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    mileageRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    deliveryCompletionBonus: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    weekendSurchargePercent: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.00
    },
    peakHourSurchargePercent: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.00
    },
    longDistanceSurchargePercent: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.00
    },
    holidaySurchargePercent: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.00
    },
    longDistanceThresholdKm: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 20.0
    },
    maximumAllowableDistance: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 50.0
    },
    guaranteedMinimumPay: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    effectiveFrom: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    },
    effectiveTo: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    }
  }).catch(error => {
    // Skip if table already exists
    if (!error.message.includes('already exists')) {
      throw error;
    }
    console.log('DriverCompensationConfigs table already exists, skipping...');
  });

  // 9. Create DriverEarnings table
  console.log('Creating DriverEarnings table...');
  await queryInterface.createTable('DriverEarnings', {
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
    deliveryId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Deliveries',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    batchId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'DeliveryBatches',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    breakdown: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    earningType: {
      type: DataTypes.ENUM('delivery', 'bonus', 'adjustment', 'correction'),
      defaultValue: 'delivery'
    },
    configId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'DriverCompensationConfigs',
        key: 'id'
      }
    },
    distanceKm: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    paymentId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    earningDate: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    }
  }).catch(error => {
    // Skip if table already exists
    if (!error.message.includes('already exists')) {
      throw error;
    }
    console.log('DriverEarnings table already exists, skipping...');
  });

  // Add indexes to DriverEarnings
  try {
    await queryInterface.addIndex('DriverEarnings', ['driverId']);
    await queryInterface.addIndex('DriverEarnings', ['deliveryId']);
    await queryInterface.addIndex('DriverEarnings', ['batchId']);
    await queryInterface.addIndex('DriverEarnings', ['isPaid']);
    await queryInterface.addIndex('DriverEarnings', ['earningDate']);
  } catch (error) {
    if (!error.message.includes('already exists')) {
      console.warn('Warning when adding driver earnings indexes:', error.message);
    }
  }

  console.log('All migration steps completed successfully');
}

// Down Migration - Drop all tables in reverse order
async function down(queryInterface, Sequelize) {
  console.log('Running complete schema rollback migration');
  
  // Drop tables in reverse dependency order
  try {
    await queryInterface.dropTable('DriverEarnings');
    await queryInterface.dropTable('DriverCompensationConfigs');
    
    // Remove batchId from Deliveries before dropping referenced tables
    await queryInterface.removeColumn('Deliveries', 'batchId');
    
    await queryInterface.dropTable('RouteOptimizationHistories');
    await queryInterface.dropTable('DeliveryBatches');
    await queryInterface.dropTable('Deliveries');
    await queryInterface.dropTable('Orders');
    await queryInterface.dropTable('Memberships');
    await queryInterface.dropTable('Users');
  
    console.log('All tables dropped successfully');
  } catch (error) {
    console.error('Error during rollback:', error.message);
    throw error;
  }
}

module.exports = {
  up,
  down
};
