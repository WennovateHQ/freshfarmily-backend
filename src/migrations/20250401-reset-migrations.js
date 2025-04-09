/**
 * FreshFarmily Reset Migration
 * Date: 2025-04-01
 * 
 * This is a comprehensive reset migration that creates all necessary tables for the 
 * FreshFarmily application in the correct order with proper relationships.
 * 
 * It is intended for setting up new development environments or performing a 
 * complete database reset.
 */

const { DataTypes } = require('sequelize');

async function up(queryInterface, Sequelize) {
  console.log('Starting FreshFarmily database reset migration...');

  // *** USERS ***
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
      type: DataTypes.ENUM('admin', 'customer', 'farmer', 'driver'),
      defaultValue: 'customer'
    },
    permissions: {
      type: DataTypes.TEXT,
      defaultValue: '[]',
      // Implementation details (getters/setters) belong in the model, not in migrations
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      defaultValue: 'active'
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  });

  // *** REFERRALS ***
  await queryInterface.createTable('referral_info', {
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
    referralCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    referralCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  });

  // *** WISHLISTS ***
  await queryInterface.createTable('wishlists', {
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
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  });

  // *** FARMS ***
  await queryInterface.createTable('farms', {
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
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false
    },
    zipCode: {
      type: DataTypes.STRING,
      allowNull: false
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    contactEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    contactPhone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    website: {
      type: DataTypes.STRING,
      allowNull: true
    },
    logoUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bannerUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    // No acceptsPickup or pickupInstructions as FreshFarmily handles all deliveries
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    operatingHours: {
      type: DataTypes.JSON,
      allowNull: true
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  });

  // *** PRODUCTS ***
  await queryInterface.createTable('products', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    farmId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'farms',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    inventory: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isOrganic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    tags: {
      type: DataTypes.STRING,
      defaultValue: '[]'
    },
    harvestDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'sold_out', 'discontinued'),
      defaultValue: 'active'
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  });

  // *** PRODUCT REVIEWS ***
  await queryInterface.createTable('product_reviews', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
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
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'approved'
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  });

  // *** ORDERS ***
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
        'processing',
        'shipped',
        'delivered',
        'cancelled'
      ),
      defaultValue: 'pending'
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    shippingAddress: {
      type: DataTypes.JSON,
      allowNull: false
    },
    deliveryMethod: {
      type: DataTypes.ENUM('standard', 'express', 'scheduled'),
      defaultValue: 'standard'
    },
    deliveryNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    deliveryFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
      defaultValue: 'pending'
    },
    scheduledDeliveryDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  });

  // *** ORDER ITEMS ***
  await queryInterface.createTable('order_items', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    farmId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'farms',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  });

  // *** DELIVERY-RELATED TABLES ***
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
    status: {
      type: DataTypes.ENUM(
        'pending',
        'assigned',
        'in_transit',
        'delivered',
        'failed'
      ),
      defaultValue: 'pending'
    },
    estimatedDeliveryTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    actualDeliveryTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deliveryNotes: {
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
    deliveryBatchId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
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
      type: DataTypes.ENUM(
        'planned',
        'in_progress',
        'completed',
        'cancelled'
      ),
      defaultValue: 'planned'
    },
    plannedDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    routeOptimizationId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    region: {
      type: DataTypes.STRING,
      allowNull: false
    },
    totalDistance: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    estimatedDuration: {
      type: DataTypes.INTEGER, // in minutes
      allowNull: true
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  });

  // Create RouteOptimizationHistory table
  await queryInterface.createTable('route_optimization_history', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    batchId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    optimizationAlgorithm: {
      type: DataTypes.STRING,
      allowNull: false
    },
    originalRoute: {
      type: DataTypes.JSON,
      allowNull: true
    },
    optimizedRoute: {
      type: DataTypes.JSON,
      allowNull: false
    },
    distanceSaved: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    timeSaved: {
      type: DataTypes.INTEGER, // in minutes
      allowNull: true
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  });

  // *** PAYMENT-RELATED TABLES ***
  // Create PaymentInfo table
  await queryInterface.createTable('payment_info', {
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
    paymentIntentId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'USD',
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  });

  // Create FarmerPayment table
  await queryInterface.createTable('farmer_payments', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    farmerId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    platformFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  });

  // Create FarmerPayout table
  await queryInterface.createTable('farmer_payouts', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    farmerId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    payoutMethod: {
      type: DataTypes.STRING,
      allowNull: false
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  });

  // *** PRICING-RELATED TABLES ***
  // Create PricingConfiguration table
  await queryInterface.createTable('pricing_configurations', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    platformCommissionRate: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.10
    },
    deliveryBaseFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 5.00
    },
    deliveryDistanceRate: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.50 // $ per mile
    },
    taxRate: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.07
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  });

  // Create DriverCompensationConfig table
  await queryInterface.createTable('driver_compensation_configs', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    basePayPerDelivery: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 3.50
    },
    mileageRate: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.30 // $ per mile
    },
    timeFactor: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.20 // Additional $ per minute
    },
    bonusThreshold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15 // Deliveries per day
    },
    bonusAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 25.00
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  });

  console.log('Reset migration completed successfully.');
}

async function down(queryInterface, Sequelize) {
  // Drop all tables in reverse order
  console.log('Reverting all tables...');

  // Pricing-related tables
  await queryInterface.dropTable('driver_compensation_configs');
  await queryInterface.dropTable('pricing_configurations');
  
  // Payment-related tables
  await queryInterface.dropTable('farmer_payouts');
  await queryInterface.dropTable('farmer_payments');
  await queryInterface.dropTable('payment_info');
  
  // Delivery-related tables
  await queryInterface.dropTable('route_optimization_history');
  await queryInterface.dropTable('delivery_batches');
  await queryInterface.dropTable('deliveries');
  
  // Order tables
  await queryInterface.dropTable('order_items');
  await queryInterface.dropTable('orders');
  
  // Product tables
  await queryInterface.dropTable('product_reviews');
  await queryInterface.dropTable('products');
  
  // Farm table
  await queryInterface.dropTable('farms');
  
  // Wishlist table
  await queryInterface.dropTable('wishlists');
  
  // Referral table
  await queryInterface.dropTable('referral_info');
  
  // Users table
  await queryInterface.dropTable('Users');
  
  console.log('All tables have been dropped.');
}

module.exports = {
  up,
  down
};
