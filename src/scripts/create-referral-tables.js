/**
 * Create Referral Tables Script
 * 
 * This script:
 * 1. Checks if the referral tables exist
 * 2. Creates them if they don't
 * 3. Uses a simpler structure without complex indices
 */

const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

async function createReferralTables() {
  try {
    logger.info('Starting creation of referral tables if they don\'t exist');
    
    // Check if tables exist
    const [tables] = await sequelize.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_type = 'BASE TABLE'`
    );
    
    const tableNames = tables.map(t => t.table_name);
    logger.info(`Found tables: ${tableNames.join(', ')}`);
    
    // Create referral_info table if it doesn't exist
    if (!tableNames.includes('referral_info')) {
      logger.info('Creating referral_info table...');
      
      try {
        await sequelize.query(`
          CREATE TABLE referral_info (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "userId" UUID NOT NULL,
            "farmerReferralCode" VARCHAR(12),
            "customerReferralCode" VARCHAR(12),
            "referralStatus" VARCHAR(20) DEFAULT 'active',
            "remainingCredit" DECIMAL(10,2) DEFAULT 0.00,
            "totalEarnedCredit" DECIMAL(10,2) DEFAULT 0.00,
            "freeDeliveriesRemaining" INTEGER DEFAULT 0,
            "totalFreeDeliveries" INTEGER DEFAULT 0,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `);
        
        logger.info('Successfully created referral_info table');
      } catch (error) {
        logger.error(`Error creating referral_info table: ${error.message}`);
      }
    } else {
      logger.info('referral_info table already exists');
    }
    
    // Create referral_history table if it doesn't exist
    if (!tableNames.includes('referral_history')) {
      logger.info('Creating referral_history table...');
      
      try {
        await sequelize.query(`
          CREATE TABLE referral_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "referrerId" UUID NOT NULL,
            "referredId" UUID NOT NULL,
            "referralCode" VARCHAR(12) NOT NULL,
            "referralType" VARCHAR(50),
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
          )
        `);
        
        logger.info('Successfully created referral_history table');
      } catch (error) {
        logger.error(`Error creating referral_history table: ${error.message}`);
      }
    } else {
      logger.info('referral_history table already exists');
    }
    
    // Create sample referral data for farmers
    try {
      // Find farmer users
      const [farmers] = await sequelize.query(
        `SELECT id, email FROM users WHERE role = 'farmer' LIMIT 3`
      );
      
      logger.info(`Found ${farmers.length} farmers to create referral info for`);
      
      for (const farmer of farmers) {
        // Check if the farmer already has referral info
        const [existingInfo] = await sequelize.query(
          `SELECT id FROM referral_info WHERE "userId" = :userId`,
          {
            replacements: { userId: farmer.id },
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        if (!existingInfo) {
          // Generate unique referral codes
          const farmerCode = `FF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          const customerCode = `FC${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          
          // Create the referral info
          await sequelize.query(`
            INSERT INTO referral_info (
              "userId", "farmerReferralCode", "customerReferralCode", 
              "referralStatus", "remainingCredit", "totalEarnedCredit",
              "freeDeliveriesRemaining", "totalFreeDeliveries"
            ) VALUES (
              :userId, :farmerCode, :customerCode,
              'active', 0, 0, 0, 0
            )
          `, {
            replacements: {
              userId: farmer.id,
              farmerCode,
              customerCode
            }
          });
          
          logger.info(`Created referral info for farmer ${farmer.email} with codes: ${farmerCode}, ${customerCode}`);
        } else {
          logger.info(`Farmer ${farmer.email} already has referral info`);
        }
      }
    } catch (error) {
      logger.error(`Error creating sample referral data: ${error.message}`);
    }
    
    logger.info('Referral tables creation process completed');
  } catch (error) {
    logger.error(`Error in referral tables creation: ${error.message}`);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

// Run the creation process
createReferralTables();
