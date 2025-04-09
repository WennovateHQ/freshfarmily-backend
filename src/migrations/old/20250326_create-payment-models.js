/**
 * FreshFarmily Payment Schema Migration
 * Date: 2025-03-26
 * 
 * This combined migration creates all necessary tables for the payment-related models:
 * - PaymentInfo
 * - FarmerPayment
 * - FarmerPayout
 */

const { DataTypes } = require('sequelize');

async function up(queryInterface, Sequelize) {
  console.log('Creating PaymentInfo, FarmerPayment, and FarmerPayout tables');

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
      allowNull: false,
      defaultValue: 'card'
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'processing', 'succeeded', 'failed', 'refunded'),
      defaultValue: 'pending'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'CAD'
    },
    cardLast4: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cardBrand: {
      type: DataTypes.STRING,
      allowNull: true
    },
    freeDeliveryApplied: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Flag indicating if free delivery from referral was applied'
    },
    receiptUrl: {
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

  // Add indexes for PaymentInfo
  await queryInterface.addIndex('payment_info', {
    fields: ['orderId'],
    unique: true
  });
  await queryInterface.addIndex('payment_info', ['paymentIntentId']);
  await queryInterface.addIndex('payment_info', ['paymentStatus']);

  // Create FarmerPayment table
  await queryInterface.createTable('farmer_payments', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    farmerId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    farmName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Amount due to farmer after platform commission'
    },
    commission: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Platform commission amount'
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    payoutId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Reference to the payout this payment was included in'
    },
    paymentDetails: {
      type: DataTypes.JSON,
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

  // Add indexes for FarmerPayment
  await queryInterface.addIndex('farmer_payments', ['farmerId']);
  await queryInterface.addIndex('farmer_payments', ['orderId']);
  await queryInterface.addIndex('farmer_payments', ['isPaid']);

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
    farmName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Total payout amount including any applied referral credits'
    },
    originalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Original amount before any referral credits were applied'
    },
    creditApplied: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Amount of referral credit applied to this payout'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'bank_transfer'
    },
    paymentReference: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
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

  // Add indexes for FarmerPayout
  await queryInterface.addIndex('farmer_payouts', ['farmerId']);
  await queryInterface.addIndex('farmer_payouts', ['status']);
  await queryInterface.addIndex('farmer_payouts', ['createdAt']);

  console.log('PaymentInfo, FarmerPayment, and FarmerPayout tables created successfully');
}

async function down(queryInterface, Sequelize) {
  console.log('Dropping PaymentInfo, FarmerPayment, and FarmerPayout tables');

  // Drop PaymentInfo table
  await queryInterface.dropTable('payment_info');

  // Drop FarmerPayment table
  await queryInterface.dropTable('farmer_payments');

  // Drop FarmerPayout table
  await queryInterface.dropTable('farmer_payouts');

  // Drop ENUM types for PostgreSQL if they exist
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payment_info_paymentStatus";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_farmer_payouts_status";');

  console.log('Rollback migration completed successfully');
}

module.exports = {
  up,
  down
};
