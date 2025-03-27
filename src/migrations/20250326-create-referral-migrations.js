/**
 * FreshFarmily Referral Schema Migration
 * Date: 2025-03-26
 * 
 * This migration creates the necessary tables for the referral program models:
 * - ReferralInfo
 * - ReferralHistory
 */

// Changed 'users' to 'Users' to match the User schema
const { DataTypes } = require('sequelize');

async function up(queryInterface, Sequelize) {
  console.log('Creating ReferralInfo and ReferralHistory tables');

  // Create referral_info table
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
      }
    },
    referredBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    referralType: {
      type: Sequelize.ENUM(
        'farmer_to_farmer',
        'farmer_to_customer',
        'customer_to_farmer',
        'customer_to_customer'
      ),
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
      type: Sequelize.ENUM('pending', 'active', 'completed', 'blocked'),
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
      defaultValue: Sequelize.fn('NOW')
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    }
  }, { tableName: 'referral_info' });

  // Add indexes for referral_info
  await queryInterface.addIndex('referral_info', {
    fields: ['userId'],
    unique: true
  });
  await queryInterface.addIndex('referral_info', {
    fields: ['farmerReferralCode'],
    unique: true
  });
  await queryInterface.addIndex('referral_info', {
    fields: ['customerReferralCode'],
    unique: true
  });
  await queryInterface.addIndex('referral_info', ['referredBy']);

  // Create referral_history table
  await queryInterface.createTable('referral_history', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    referrerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    referredId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    referralCode: {
      type: DataTypes.STRING(12),
      allowNull: false
    },
    referralType: {
      type: Sequelize.ENUM(
        'farmer_to_farmer',
        'farmer_to_customer',
        'customer_to_farmer',
        'customer_to_customer'
      ),
      allowNull: false
    },
    status: {
      type: Sequelize.ENUM('pending', 'completed', 'expired', 'declined'),
      defaultValue: 'pending',
      allowNull: false
    },
    referrerRewardType: {
      type: Sequelize.ENUM('none', 'cashback', 'free_deliveries'),
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
      type: Sequelize.ENUM('none', 'cashback', 'free_deliveries'),
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
      defaultValue: Sequelize.fn('NOW')
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    }
  }, { tableName: 'referral_history' });

  // Add indexes for referral_history
  await queryInterface.addIndex('referral_history', ['referrerId']);
  await queryInterface.addIndex('referral_history', ['referredId']);
  await queryInterface.addIndex('referral_history', ['referralCode']);
  await queryInterface.addIndex('referral_history', ['status']);

  console.log('ReferralInfo and ReferralHistory tables created successfully');
}

async function down(queryInterface, Sequelize) {
  console.log('Dropping ReferralInfo and ReferralHistory tables');

  await queryInterface.dropTable('referral_history');
  await queryInterface.dropTable('referral_info');

  // Drop ENUM types (PostgreSQL)
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_referral_info_referralType";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_referral_info_referralStatus";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_referral_history_referralType";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_referral_history_status";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_referral_history_referrerRewardType";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_referral_history_referredRewardType";');

  console.log('Rollback migration completed successfully');
}

module.exports = {
  up,
  down
};
