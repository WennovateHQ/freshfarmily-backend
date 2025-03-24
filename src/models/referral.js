/**
 * Referral Model
 * 
 * Defines the referral program models for the FreshFarmily system
 */

const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');
const logger = require('../utils/logger');

// ReferralInfo model - stores user referral information
const ReferralInfo = sequelize.define('ReferralInfo', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  referredBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  referralType: {
    type: DataTypes.ENUM,
    values: [
      'farmer_to_farmer',    // Farmer referring another farmer
      'farmer_to_customer',  // Farmer referring a customer
      'customer_to_farmer',  // Customer referring a farmer
      'customer_to_customer' // Customer referring another customer
    ],
    allowNull: true
  },
  farmerReferralCode: {
    type: DataTypes.STRING(12),
    allowNull: true,
    unique: true
  },
  customerReferralCode: {
    type: DataTypes.STRING(12),
    allowNull: true,
    unique: true
  },
  referralStatus: {
    type: DataTypes.ENUM,
    values: ['pending', 'active', 'completed', 'blocked'],
    defaultValue: 'pending',
    allowNull: false
  },
  remainingCredit: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    allowNull: false
  },
  totalEarnedCredit: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    allowNull: false,
    comment: 'Total cashback earned from referrals - helps enforce the lifetime maximum limit'
  },
  freeDeliveriesRemaining: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  totalFreeDeliveries: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: 'Total free deliveries earned from referrals - helps enforce the lifetime maximum limit'
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
  tableName: 'referral_info',
  indexes: [
    {
      fields: ['userId'],
      unique: true
    },
    {
      fields: ['farmerReferralCode'],
      unique: true
    },
    {
      fields: ['customerReferralCode'],
      unique: true
    },
    {
      fields: ['referredBy']
    }
  ],
  hooks: {
    beforeCreate: async (referralInfo) => {
      // Generate unique referral codes if not provided
      if (!referralInfo.farmerReferralCode) {
        let isUnique = false;
        let farmerCode;
        
        // Generate until we find a unique code
        while (!isUnique) {
          farmerCode = 'FF' + crypto.randomBytes(4).toString('hex').toUpperCase();
          
          // Check if code exists
          const existingCode = await ReferralInfo.findOne({
            where: { farmerReferralCode: farmerCode }
          });
          
          isUnique = !existingCode;
        }
        
        referralInfo.farmerReferralCode = farmerCode;
      }
      
      if (!referralInfo.customerReferralCode) {
        let isUnique = false;
        let customerCode;
        
        // Generate until we find a unique code
        while (!isUnique) {
          customerCode = 'FC' + crypto.randomBytes(4).toString('hex').toUpperCase();
          
          // Check if code exists
          const existingCode = await ReferralInfo.findOne({
            where: { customerReferralCode: customerCode }
          });
          
          isUnique = !existingCode;
        }
        
        referralInfo.customerReferralCode = customerCode;
      }
      
      logger.debug(`Generated unique referral codes for user ${referralInfo.userId}`);
    }
  }
});

// ReferralHistory model - tracks referrals and rewards
const ReferralHistory = sequelize.define('ReferralHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  referrerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  referredId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  referralCode: {
    type: DataTypes.STRING(12),
    allowNull: false
  },
  referralType: {
    type: DataTypes.ENUM,
    values: [
      'farmer_to_farmer',
      'farmer_to_customer',
      'customer_to_farmer',
      'customer_to_customer'
    ],
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM,
    values: ['pending', 'completed', 'expired', 'declined'],
    defaultValue: 'pending',
    allowNull: false
  },
  referrerRewardType: {
    type: DataTypes.ENUM,
    values: ['none', 'cashback', 'free_deliveries'],
    defaultValue: 'none',
    allowNull: false
  },
  referrerRewardAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    allowNull: false
  },
  referrerFreeDeliveries: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  referredRewardType: {
    type: DataTypes.ENUM,
    values: ['none', 'cashback', 'free_deliveries'],
    defaultValue: 'none',
    allowNull: false
  },
  referredRewardAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    allowNull: false
  },
  referredFreeDeliveries: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  qualificationEvent: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Event that triggered reward qualification (e.g., first_sale, order_completed)'
  },
  qualificationDate: {
    type: DataTypes.DATE,
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
  tableName: 'referral_history',
  indexes: [
    {
      fields: ['referrerId']
    },
    {
      fields: ['referredId']
    },
    {
      fields: ['referralCode']
    },
    {
      fields: ['status']
    }
  ]
});

// Function to establish associations between models
const establishAssociations = () => {
  const { User } = require('./user');
  
  // ReferralInfo associations
  ReferralInfo.belongsTo(User, {
    foreignKey: 'userId',
    as: 'User'
  });
  
  ReferralInfo.belongsTo(User, {
    foreignKey: 'referredBy',
    as: 'Referrer'
  });
  
  // ReferralHistory associations
  ReferralHistory.belongsTo(User, {
    foreignKey: 'referrerId',
    as: 'Referrer'
  });
  
  ReferralHistory.belongsTo(User, {
    foreignKey: 'referredId',
    as: 'ReferredUser'
  });
};

module.exports = {
  ReferralInfo,
  ReferralHistory,
  establishAssociations
};
