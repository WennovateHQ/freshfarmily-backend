/**
 * Setup Referral Tables
 * 
 * This script creates the necessary referral tables in the database
 */

const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

async function setupReferralTables() {
  try {
    logger.info('Starting referral tables setup');
    
    // Create the referral_info table
    logger.info('Creating referral_info table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS referral_info (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "referredBy" UUID REFERENCES users(id),
        "farmerReferralCode" VARCHAR(12) UNIQUE,
        "customerReferralCode" VARCHAR(12) UNIQUE,
        "referralStatus" VARCHAR(20) DEFAULT 'active',
        "remainingCredit" DECIMAL(10,2) DEFAULT 0.00,
        "totalEarnedCredit" DECIMAL(10,2) DEFAULT 0.00,
        "freeDeliveriesRemaining" INTEGER DEFAULT 0,
        "totalFreeDeliveries" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_referral_info_user_id ON referral_info ("userId");
      CREATE INDEX IF NOT EXISTS idx_referral_info_referred_by ON referral_info ("referredBy");
    `);
    logger.info('Successfully created referral_info table');
    
    // Create referral_history table
    logger.info('Creating referral_history table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS referral_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "referrerId" UUID NOT NULL REFERENCES users(id),
        "referredId" UUID NOT NULL REFERENCES users(id),
        "referralCode" VARCHAR(12) NOT NULL,
        "referralType" VARCHAR(50) NOT NULL,
        "status" VARCHAR(20) DEFAULT 'pending',
        "referrerRewardType" VARCHAR(20) DEFAULT 'none',
        "referrerRewardAmount" DECIMAL(10,2) DEFAULT 0.00,
        "referrerFreeDeliveries" INTEGER DEFAULT 0,
        "referredRewardType" VARCHAR(20) DEFAULT 'none',
        "referredRewardAmount" DECIMAL(10,2) DEFAULT 0.00,
        "referredFreeDeliveries" INTEGER DEFAULT 0,
        "qualificationEvent" VARCHAR(100),
        "qualificationDate" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_referral_history_referrer_id ON referral_history ("referrerId");
      CREATE INDEX IF NOT EXISTS idx_referral_history_referred_id ON referral_history ("referredId");
      CREATE INDEX IF NOT EXISTS idx_referral_history_code ON referral_history ("referralCode");
    `);
    logger.info('Successfully created referral_history table');
    
    // Create demo referral data for testing
    logger.info('Creating demo referral data for testing...');
    
    // Find farmer users
    const [farmers] = await sequelize.query(
      `SELECT id FROM users WHERE role = 'farmer' LIMIT 2`
    );
    
    if (farmers.length > 0) {
      const farmerId = farmers[0].id;
      logger.info(`Creating referral info for farmer ${farmerId}`);
      
      // Generate unique referral codes
      const farmerCode = `FF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const customerCode = `FC${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      // Add the referral info
      await sequelize.query(`
        INSERT INTO referral_info (
          "userId", "farmerReferralCode", "customerReferralCode", 
          "referralStatus", "remainingCredit", "totalEarnedCredit",
          "freeDeliveriesRemaining", "totalFreeDeliveries"
        ) VALUES (
          :farmerId, :farmerCode, :customerCode,
          'active', 0, 0, 0, 0
        ) ON CONFLICT ("userId") DO NOTHING
      `, {
        replacements: {
          farmerId,
          farmerCode,
          customerCode
        }
      });
      
      // Add a second farmer if available
      if (farmers.length > 1) {
        const secondFarmerId = farmers[1].id;
        
        // Generate unique referral codes for second farmer
        const farmerCode2 = `FF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const customerCode2 = `FC${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        // Add referral info for second farmer
        await sequelize.query(`
          INSERT INTO referral_info (
            "userId", "farmerReferralCode", "customerReferralCode", 
            "referralStatus", "remainingCredit", "totalEarnedCredit",
            "freeDeliveriesRemaining", "totalFreeDeliveries"
          ) VALUES (
            :farmerId, :farmerCode, :customerCode,
            'active', 0, 0, 0, 0
          ) ON CONFLICT ("userId") DO NOTHING
        `, {
          replacements: {
            farmerId: secondFarmerId,
            farmerCode: farmerCode2,
            customerCode: customerCode2
          }
        });
      }
    } else {
      logger.warn('No farmer users found for creating demo referral data');
    }
    
    logger.info('Referral tables setup completed successfully');
  } catch (error) {
    logger.error(`Error setting up referral tables: ${error.message}`);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

// Run the setup
setupReferralTables();
