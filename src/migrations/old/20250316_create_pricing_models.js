/**
 * Migration: Create Pricing and Driver Compensation Models
 * Date: 2025-03-16
 * 
 * This migration creates the tables necessary for the pricing strategy and
 * driver compensation models in the FreshFarmily system.
 */

const { DataTypes } = require('sequelize');

// Up Migration - Create tables
async function up(queryInterface, Sequelize) {
  console.log('Running migration to create Pricing and Driver Compensation tables');
  
  // Create PricingConfiguration table
  await queryInterface.createTable('PricingConfigurations', {
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
      defaultValue: 0.05
    },
    farmerServicesRate: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.05
    },
    paymentProcessingPercentage: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.018
    },
    paymentProcessingFlatFee: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.20
    },
    urbanDeliveryPercentage: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.035
    },
    urbanMinimumFee: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1.99
    },
    suburbanDeliveryPercentage: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.045
    },
    suburbanMinimumFee: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 2.49
    },
    ruralDeliveryPercentage: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.055
    },
    ruralMinimumFee: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 3.49
    },
    supplyChainInsuranceFee: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.50
    },
    nonMemberFeeCap: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.30
    },
    memberFeeCap: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.25
    },
    baseDeliveryFee: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 7.99
    },
    smallOrderDiscount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: -1.50
    },
    mediumOrderDiscount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: -3.50
    },
    largeOrderDiscount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: -7.00
    },
    distanceSurchargeThreshold1: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15
    },
    distanceSurchargeThreshold2: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 25
    },
    distanceSurchargeThreshold3: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 35
    },
    distanceSurcharge1: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1.50
    },
    distanceSurcharge2: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 3.00
    },
    distanceSurcharge3: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 5.00
    },
    membershipFee: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 9.99
    },
    memberDeliveryDiscount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.50
    },
    memberFreeDeliveryThreshold: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 65.00
    },
    memberProductDiscount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.04
    },
    effectiveDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    },
    expirationDate: {
      type: DataTypes.DATE,
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
  
  // Create DriverCompensationConfig table
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
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    baseHourlyRate: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 16.00
    },
    deliveryCompletionBonus: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 4.25
    },
    mileageCompensation: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.15
    },
    efficiencyThreshold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3
    },
    efficiencyBonus: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1.25
    },
    batchDeliveryThreshold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3
    },
    batchDeliveryBonus: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 2.50
    },
    satisfactionRatingThreshold: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 4.8
    },
    satisfactionWeeklyBonus: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 35.00
    },
    retentionMilestone1Months: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3
    },
    retentionMilestone1Bonus: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 150.00
    },
    retentionMilestone2Months: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 6
    },
    retentionMilestone2Bonus: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 150.00
    },
    retentionMilestone3Months: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 12
    },
    retentionMilestone3Bonus: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 150.00
    },
    remoteAreaSurcharge: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 3.50
    },
    difficultAccessSurcharge: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 2.00
    },
    weekendHolidaySurcharge: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 2.50
    },
    afterHoursSurcharge: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 2.00
    },
    effectiveDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    },
    expirationDate: {
      type: DataTypes.DATE,
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
  
  // Create OrderCharge table
  await queryInterface.createTable('OrderCharges', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'Orders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    pricingConfigId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'PricingConfigurations',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    productSubtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    platformCommission: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    farmerServicesFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    paymentProcessingFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    deliveryServiceFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    insuranceFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    baseDeliveryFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    distanceSurcharge: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    orderSizeDiscount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    membershipDiscount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    feeCapDiscount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    subtotalBeforeTax: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
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
    customerPlatformFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    customerDeliveryFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    farmerRevenue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    driverRevenue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    platformRevenue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
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
  
  // Create DriverEarnings table
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
      onDelete: 'RESTRICT'
    },
    payPeriodStart: {
      type: DataTypes.DATE,
      allowNull: false
    },
    payPeriodEnd: {
      type: DataTypes.DATE,
      allowNull: false
    },
    hoursWorked: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    baseHourlyPay: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    deliveriesCompleted: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    deliveryBonusAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    distanceDriven: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    mileageAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    efficiencyBonusAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    batchBonusAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    satisfactionBonusAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    retentionBonusAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    specialConditionAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    totalEarnings: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    paymentReference: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paymentDate: {
      type: DataTypes.DATE,
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
  
  // Create Membership table
  await queryInterface.createTable('Memberships', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    },
    renewalDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    autoRenew: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    membershipType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'standard'
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paymentReference: {
      type: DataTypes.STRING,
      allowNull: true
    },
    referralCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    referredBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
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
  await queryInterface.addIndex('PricingConfigurations', ['isActive', 'effectiveDate']);
  await queryInterface.addIndex('DriverCompensationConfigs', ['isActive', 'effectiveDate']);
  await queryInterface.addIndex('OrderCharges', ['orderId']);
  await queryInterface.addIndex('DriverEarnings', ['driverId', 'payPeriodStart', 'payPeriodEnd']);
  await queryInterface.addIndex('DriverEarnings', ['isPaid']);
  await queryInterface.addIndex('Memberships', ['userId']);
  await queryInterface.addIndex('Memberships', ['referralCode']);
  
  console.log('Migration completed successfully');
}

// Down Migration - Drop tables
async function down(queryInterface, Sequelize) {
  console.log('Running rollback migration');
  
  // Drop tables in reverse order of creation (dependencies)
  await queryInterface.dropTable('Memberships');
  await queryInterface.dropTable('DriverEarnings');
  await queryInterface.dropTable('OrderCharges');
  await queryInterface.dropTable('DriverCompensationConfigs');
  await queryInterface.dropTable('PricingConfigurations');
  
  console.log('Rollback migration completed successfully');
}

module.exports = {
  up,
  down
};
