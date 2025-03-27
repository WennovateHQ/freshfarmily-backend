/**
 * FreshFarmily Pricing Schema Migration
 * Date: 2025-03-26
 * 
 * This combined migration creates all necessary tables for the FreshFarmily pricing system including:
 * - PricingConfiguration
 * - DriverCompensationConfig
 * - OrderCharge
 * - DriverEarnings
 * - Membership
 */

const { DataTypes } = require('sequelize');

async function up(queryInterface, Sequelize) {
  console.log('Creating Pricing and Compensation tables');

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
      defaultValue: 0.05,
      comment: 'Base commission rate taken by platform'
    },
    farmerServicesRate: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.05,
      comment: 'Additional service fee for farmer support'
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
      defaultValue: -1.50,
      comment: 'Discount for orders $35-$60'
    },
    mediumOrderDiscount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: -3.50,
      comment: 'Discount for orders $60-$100'
    },
    largeOrderDiscount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: -7.00,
      comment: 'Discount for orders $100+'
    },
    distanceSurchargeThreshold1: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      comment: 'First distance threshold in km'
    },
    distanceSurchargeThreshold2: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 25,
      comment: 'Second distance threshold in km'
    },
    distanceSurchargeThreshold3: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 35,
      comment: 'Third distance threshold in km'
    },
    distanceSurcharge1: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1.50,
      comment: 'Surcharge for distances between threshold1 and threshold2'
    },
    distanceSurcharge2: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 3.00,
      comment: 'Surcharge for distances between threshold2 and threshold3'
    },
    distanceSurcharge3: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 5.00,
      comment: 'Surcharge for distances beyond threshold3'
    },
    membershipFee: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 9.99
    },
    memberDeliveryDiscount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.50,
      comment: '50% discount on delivery fees for members'
    },
    memberFreeDeliveryThreshold: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 65.00,
      comment: 'Order value threshold for free delivery for members'
    },
    memberProductDiscount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.04,
      comment: '4% discount on products for members'
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
  await queryInterface.createTable('driver_compensation_configs', {
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
      defaultValue: 0.15,
      comment: 'Per kilometer compensation'
    },
    efficiencyThreshold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      comment: 'Deliveries per hour threshold for efficiency bonus'
    },
    efficiencyBonus: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1.25,
      comment: 'Bonus per delivery when exceeding efficiency threshold'
    },
    batchDeliveryThreshold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      comment: 'Number of deliveries in a batch before bonus applies'
    },
    batchDeliveryBonus: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 2.50,
      comment: 'Bonus per delivery beyond the threshold in a batch'
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
  await queryInterface.createTable('order_charges', {
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
    pricingConfigId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    productSubtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    platformCommission: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Base platform commission (5%)'
    },
    farmerServicesFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Additional farmer services fee (5%)'
    },
    paymentProcessingFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    deliveryServiceFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Service fee based on region type (urban/suburban/rural)'
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
      defaultValue: 0.00,
      comment: 'Discount applied to enforce fee cap'
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
      allowNull: false,
      comment: 'Combined platform fees shown to customer'
    },
    customerDeliveryFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Final delivery fee shown to customer'
    },
    farmerRevenue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '90% of product value'
    },
    driverRevenue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '85% of delivery fee'
    },
    platformRevenue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Total platform revenue'
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
  await queryInterface.createTable('driver_earnings', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    driverId: {
      type: DataTypes.UUID,
      allowNull: false
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
  await queryInterface.createTable('memberships', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true
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

  console.log('Pricing and Compensation tables created successfully');
}

async function down(queryInterface, Sequelize) {
  console.log('Dropping Pricing and Compensation tables');

  await queryInterface.dropTable('memberships');
  await queryInterface.dropTable('driver_earnings');
  await queryInterface.dropTable('order_charges');
  await queryInterface.dropTable('driver_compensation_configs');
  await queryInterface.dropTable('pricing_configurations');

  console.log('Rollback migration completed successfully');
}

module.exports = {
  up,
  down
};
