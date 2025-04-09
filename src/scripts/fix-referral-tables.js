/**
 * Fix Referral Tables Script
 * 
 * This script checks and creates the referral_info and referral_history tables
 * if they don't exist, using lowercase table names to match other tables.
 */

const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

async function checkAndFixReferralTables() {
  try {
    logger.info('Starting referral tables check and fix script');
    
    // Check what tables exist
    const [tables] = await sequelize.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_type = 'BASE TABLE'`
    );
    
    const tableNames = tables.map(t => t.table_name);
    logger.info(`Found ${tables.length} tables in database: ${tableNames.join(', ')}`);
    
    // Check if referral_info table exists
    if (!tableNames.includes('referral_info')) {
      logger.info('referral_info table does not exist, creating it');
      
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS referral_info (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" UUID NOT NULL REFERENCES users(id),
          "referredBy" UUID REFERENCES users(id),
          "referralType" VARCHAR(20) CHECK ("referralType" IN ('farmer_to_farmer', 'farmer_to_customer', 'customer_to_farmer', 'customer_to_customer')),
          "farmerReferralCode" VARCHAR(12) UNIQUE,
          "customerReferralCode" VARCHAR(12) UNIQUE,
          "referralStatus" VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK ("referralStatus" IN ('pending', 'active', 'completed', 'blocked')),
          "remainingCredit" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          "totalEarnedCredit" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          "freeDeliveriesRemaining" INTEGER NOT NULL DEFAULT 0,
          "totalFreeDeliveries" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
        
        CREATE INDEX ON referral_info ("userId");
        CREATE INDEX ON referral_info ("referredBy");
      `);
      
      logger.info('Successfully created referral_info table');
    } else {
      logger.info('referral_info table already exists');
      
      // Check its structure
      const [columns] = await sequelize.query(
        `SELECT column_name, data_type 
         FROM information_schema.columns 
         WHERE table_name = 'referral_info'`
      );
      
      logger.info(`referral_info table has ${columns.length} columns: ${columns.map(c => c.column_name).join(', ')}`);
    }
    
    // Check if referral_history table exists
    if (!tableNames.includes('referral_history')) {
      logger.info('referral_history table does not exist, creating it');
      
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS referral_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "referrerId" UUID NOT NULL REFERENCES users(id),
          "referredId" UUID NOT NULL REFERENCES users(id),
          "referralCode" VARCHAR(12) NOT NULL,
          "referralType" VARCHAR(20) NOT NULL CHECK ("referralType" IN ('farmer_to_farmer', 'farmer_to_customer', 'customer_to_farmer', 'customer_to_customer')),
          status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'declined')),
          "referrerRewardType" VARCHAR(15) NOT NULL DEFAULT 'none' CHECK ("referrerRewardType" IN ('none', 'cashback', 'free_deliveries')),
          "referrerRewardAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          "referrerFreeDeliveries" INTEGER NOT NULL DEFAULT 0,
          "referredRewardType" VARCHAR(15) NOT NULL DEFAULT 'none' CHECK ("referredRewardType" IN ('none', 'cashback', 'free_deliveries')),
          "referredRewardAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          "referredFreeDeliveries" INTEGER NOT NULL DEFAULT 0,
          "qualificationEvent" VARCHAR(50),
          "qualificationDate" TIMESTAMP WITH TIME ZONE,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
        
        CREATE INDEX ON referral_history ("referrerId");
        CREATE INDEX ON referral_history ("referredId");
        CREATE INDEX ON referral_history ("referralCode");
        CREATE INDEX ON referral_history (status);
      `);
      
      logger.info('Successfully created referral_history table');
    } else {
      logger.info('referral_history table already exists');
      
      // Check its structure
      const [columns] = await sequelize.query(
        `SELECT column_name, data_type 
         FROM information_schema.columns 
         WHERE table_name = 'referral_history'`
      );
      
      logger.info(`referral_history table has ${columns.length} columns: ${columns.map(c => c.column_name).join(', ')}`);
    }
    
    // Create a test record for the farmer user
    const [farmers] = await sequelize.query(
      `SELECT id, email FROM users WHERE role = 'farmer' LIMIT 1`
    );
    
    if (farmers.length > 0) {
      const farmerId = farmers[0].id;
      logger.info(`Using farmer user with ID: ${farmerId}`);
      
      // Check if this farmer already has referral info
      const [referralInfo] = await sequelize.query(
        `SELECT * FROM referral_info WHERE "userId" = :farmerId`,
        { replacements: { farmerId } }
      );
      
      if (referralInfo.length === 0) {
        // Create referral info for this farmer
        const farmerCode = `FF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const customerCode = `FC${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        await sequelize.query(`
          INSERT INTO referral_info 
          ("userId", "farmerReferralCode", "customerReferralCode", "referralStatus")
          VALUES (:farmerId, :farmerCode, :customerCode, 'active')
        `, { 
          replacements: { 
            farmerId, 
            farmerCode,
            customerCode
          } 
        });
        
        logger.info(`Created test referral info for farmer ${farmerId} with codes: ${farmerCode}, ${customerCode}`);
      } else {
        logger.info(`Farmer ${farmerId} already has referral info with codes: ${referralInfo[0].farmerReferralCode}, ${referralInfo[0].customerReferralCode}`);
      }
    } else {
      logger.warn('No farmer users found to create test referral info');
    }
    
    logger.info('Referral tables check and fix completed successfully');
  } catch (error) {
    logger.error(`Error fixing referral tables: ${error.message}`);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

// Run the script
checkAndFixReferralTables();
