/**
 * Payment Models
 * 
 * Defines payment-related models for the FreshFarmily system including:
 * - Payment information
 * - Farmer payments (platform commission tracking)
 * - Farmer payouts (weekly settlement)
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

// FarmerPayment model - tracks amounts owed to farmers from orders
const FarmerPayment = sequelize.define('FarmerPayment', {
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
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'farmer_payments',
  indexes: [
    {
      fields: ['farmerId']
    },
    {
      fields: ['orderId']
    },
    {
      fields: ['isPaid']
    }
  ]
});

// FarmerPayout model - aggregates multiple payments into a weekly payout
const FarmerPayout = sequelize.define('FarmerPayout', {
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
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'farmer_payouts',
  indexes: [
    {
      fields: ['farmerId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['createdAt']
    }
  ]
});

// PaymentInfo model - extended payment information for orders
const PaymentInfo = sequelize.define('PaymentInfo', {
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
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'payment_info',
  indexes: [
    {
      fields: ['orderId'],
      unique: true
    },
    {
      fields: ['paymentIntentId']
    },
    {
      fields: ['paymentStatus']
    }
  ]
});

// Establish associations
const establishAssociations = () => {
  const { Order } = require('./order');
  const { User } = require('./user');
  
  // Payment info belongs to an order
  PaymentInfo.belongsTo(Order, {
    foreignKey: 'orderId',
    as: 'Order'
  });
  
  Order.hasOne(PaymentInfo, {
    foreignKey: 'orderId',
    as: 'Payment'
  });
  
  // Farmer payment belongs to an order
  FarmerPayment.belongsTo(Order, {
    foreignKey: 'orderId',
    as: 'Order'
  });
  
  Order.hasMany(FarmerPayment, {
    foreignKey: 'orderId',
    as: 'FarmerPayments'
  });
  
  // Farmer payment belongs to a user (farmer)
  FarmerPayment.belongsTo(User, {
    foreignKey: 'farmerId',
    as: 'Farmer'
  });
  
  User.hasMany(FarmerPayment, {
    foreignKey: 'farmerId',
    as: 'Payments'
  });
  
  // Farmer payment belongs to a payout
  FarmerPayment.belongsTo(FarmerPayout, {
    foreignKey: 'payoutId',
    as: 'Payout'
  });
  
  FarmerPayout.hasMany(FarmerPayment, {
    foreignKey: 'payoutId',
    as: 'Payments'
  });
  
  // Farmer payout belongs to a user (farmer)
  FarmerPayout.belongsTo(User, {
    foreignKey: 'farmerId',
    as: 'Farmer'
  });
  
  User.hasMany(FarmerPayout, {
    foreignKey: 'farmerId',
    as: 'Payouts'
  });
  
  logger.debug('Payment model associations established');
};

// Export models
module.exports = {
  PaymentInfo,
  FarmerPayment,
  FarmerPayout,
  establishAssociations
};
