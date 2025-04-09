/**
 * Fix Profile and Referrals Migration Script
 * 
 * This script:
 * 1. Checks what tables and columns exist in the database
 * 2. Creates or modifies the referral_info and referral_history tables as needed
 * 3. Updates the User-to-Profile associations if necessary
 */

const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

async function fixProfileAndReferralTables() {
  try {
    logger.info('Starting database schema fix for profiles and referrals');
    
    // First, check what tables exist in the database
    const [tables] = await sequelize.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_type = 'BASE TABLE'`
    );
    
    const existingTables = tables.map(t => t.table_name);
    logger.info(`Found tables in database: ${existingTables.join(', ')}`);
    
    // Check if 'profiles' table exists
    if (existingTables.includes('profiles')) {
      logger.info('Examining profiles table structure...');
      
      // Get columns in profiles table
      const [profileColumns] = await sequelize.query(
        `SELECT column_name, data_type FROM information_schema.columns 
         WHERE table_name = 'profiles'`
      );
      
      const profileColumnNames = profileColumns.map(c => c.column_name);
      logger.info(`Profile columns: ${profileColumnNames.join(', ')}`);
      
      // Ensure the profiles table has the required userId column
      if (!profileColumnNames.includes('userId')) {
        logger.info('Adding userId column to profiles table...');
        await sequelize.query(
          `ALTER TABLE profiles ADD COLUMN "userId" UUID REFERENCES users(id) ON DELETE CASCADE`
        );
        logger.info('Added userId column to profiles table');
      }
    }
    
    // Check if 'referral_info' table exists
    if (!existingTables.includes('referral_info')) {
      logger.info('Creating referral_info table...');
      
      // Create the table
      await sequelize.query(`
        CREATE TABLE referral_info (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
        
        CREATE INDEX ON referral_info ("userId");
      `);
      
      logger.info('Created referral_info table');
    } else {
      logger.info('Examining referral_info table structure...');
      
      // Get columns in referral_info table
      const [referralInfoColumns] = await sequelize.query(
        `SELECT column_name, data_type FROM information_schema.columns 
         WHERE table_name = 'referral_info'`
      );
      
      const referralInfoColumnNames = referralInfoColumns.map(c => c.column_name);
      logger.info(`Referral info columns: ${referralInfoColumnNames.join(', ')}`);
      
      // Add missing columns if needed
      const requiredColumns = [
        { name: "farmerReferralCode", type: "VARCHAR(12)" },
        { name: "customerReferralCode", type: "VARCHAR(12)" },
        { name: "referralStatus", type: "VARCHAR(20)", default: "'active'" },
        { name: "remainingCredit", type: "DECIMAL(10,2)", default: "0.00" },
        { name: "totalEarnedCredit", type: "DECIMAL(10,2)", default: "0.00" },
        { name: "freeDeliveriesRemaining", type: "INTEGER", default: "0" },
        { name: "totalFreeDeliveries", type: "INTEGER", default: "0" }
      ];
      
      for (const column of requiredColumns) {
        if (!referralInfoColumnNames.includes(column.name)) {
          logger.info(`Adding ${column.name} column to referral_info table...`);
          const defaultValue = column.default ? ` DEFAULT ${column.default}` : '';
          await sequelize.query(
            `ALTER TABLE referral_info ADD COLUMN "${column.name}" ${column.type}${defaultValue}`
          );
          logger.info(`Added ${column.name} column to referral_info table`);
        }
      }
    }
    
    // Check if 'referral_history' table exists
    if (!existingTables.includes('referral_history')) {
      logger.info('Creating referral_history table...');
      
      // Create the table
      await sequelize.query(`
        CREATE TABLE referral_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "referrerId" UUID NOT NULL REFERENCES users(id),
          "referredId" UUID NOT NULL REFERENCES users(id),
          "referralCode" VARCHAR(12) NOT NULL,
          "referralType" VARCHAR(50) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
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
        
        CREATE INDEX ON referral_history ("referrerId");
        CREATE INDEX ON referral_history ("referredId");
        CREATE INDEX ON referral_history ("referralCode");
      `);
      
      logger.info('Created referral_history table');
    }
    
    // Create test referral for first farmer user
    const [farmers] = await sequelize.query(
      `SELECT id, email, "firstName", "lastName" FROM users WHERE role = 'farmer' LIMIT 1`
    );
    
    if (farmers.length > 0) {
      const farmer = farmers[0];
      logger.info(`Testing with farmer user: ${farmer.email} (${farmer.id})`);
      
      // Check if farmer already has referral info
      const [existingInfo] = await sequelize.query(
        `SELECT * FROM referral_info WHERE "userId" = :userId`,
        { replacements: { userId: farmer.id } }
      );
      
      if (existingInfo.length === 0) {
        // Generate unique referral codes
        const farmerCode = `FF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const customerCode = `FC${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        // Create referral info
        await sequelize.query(`
          INSERT INTO referral_info (
            "userId", 
            "farmerReferralCode", 
            "customerReferralCode", 
            "referralStatus",
            "remainingCredit",
            "totalEarnedCredit",
            "freeDeliveriesRemaining",
            "totalFreeDeliveries"
          )
          VALUES (
            :userId, 
            :farmerCode, 
            :customerCode, 
            'active',
            0.00,
            0.00,
            0,
            0
          )
        `, {
          replacements: {
            userId: farmer.id,
            farmerCode,
            customerCode
          }
        });
        
        logger.info(`Created referral info for ${farmer.email} with codes: ${farmerCode}, ${customerCode}`);
      } else {
        logger.info(`Farmer ${farmer.email} already has referral info`);
      }
    }
    
    // Update the referralService.js to handle the modified database structure
    logger.info('Database schema fix for profiles and referrals completed successfully');
    logger.info('Now fixing referral service to work with the updated schema...');
    
    // Fixed version of getReferralStats function - simpler, more reliable
    const fixedCode = `
const getReferralStats = async (userId) => {
  try {
    // Get user's referral info
    const referralInfo = await ReferralInfo.findOne({
      where: { userId }
    });
    
    if (!referralInfo) {
      logger.warn(\`No referral info found for user \${userId}\`);
      return {
        success: false,
        message: 'Referral information not found'
      };
    }
    
    // Find referrals made by this user
    const referrals = await ReferralHistory.findAll({
      where: { referrerId: userId },
      include: [{
        model: User,
        as: 'ReferredUser',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role']
      }]
    });
    
    // Find who referred this user (if anyone)
    const referredBy = await ReferralHistory.findOne({
      where: { referredId: userId },
      include: [{
        model: User,
        as: 'Referrer',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role']
      }]
    });
    
    // Calculate stats
    const farmerReferrals = referrals.filter(r => r.ReferredUser && r.ReferredUser.role === 'farmer').length;
    const customerReferrals = referrals.filter(r => r.ReferredUser && r.ReferredUser.role === 'consumer').length;
    
    return {
      success: true,
      referralInfo: {
        farmerReferralCode: referralInfo.farmerReferralCode || '',
        customerReferralCode: referralInfo.customerReferralCode || '',
        remainingCredit: referralInfo.remainingCredit || 0,
        totalEarnedCredit: referralInfo.totalEarnedCredit || 0,
        freeDeliveriesRemaining: referralInfo.freeDeliveriesRemaining || 0,
        totalFreeDeliveries: referralInfo.totalFreeDeliveries || 0,
        referralStatus: referralInfo.referralStatus || 'active'
      },
      stats: {
        totalReferrals: referrals.length,
        farmerReferrals,
        customerReferrals
      },
      referredUsers: referrals.map(r => ({
        id: r.ReferredUser ? r.ReferredUser.id : null,
        name: r.ReferredUser ? \`\${r.ReferredUser.firstName} \${r.ReferredUser.lastName}\` : 'Unknown User',
        email: r.ReferredUser ? r.ReferredUser.email : null,
        role: r.ReferredUser ? r.ReferredUser.role : null,
        referralDate: r.createdAt,
        rewardType: r.referrerRewardType,
        rewardAmount: r.referrerRewardAmount,
        freeDeliveries: r.referrerFreeDeliveries
      })),
      referredBy: referredBy ? {
        id: referredBy.Referrer ? referredBy.Referrer.id : null,
        name: referredBy.Referrer ? \`\${referredBy.Referrer.firstName} \${referredBy.Referrer.lastName}\` : 'Unknown User',
        email: referredBy.Referrer ? referredBy.Referrer.email : null,
        role: referredBy.Referrer ? referredBy.Referrer.role : null,
        referralDate: referredBy.createdAt,
        referralType: referredBy.referralType
      } : null
    };
  } catch (error) {
    logger.error(\`Error getting referral stats: \${error.message}\`);
    return {
      success: false,
      message: \`Error retrieving referral data: \${error.message}\`
    };
  }
};`;
    
    // Write the fixed code to a file for reference
    const fs = require('fs');
    const path = require('path');
    
    fs.writeFileSync(
      path.join(__dirname, 'updated-getReferralStats.js'),
      fixedCode,
      'utf8'
    );
    
    logger.info('Saved updated getReferralStats function for manual implementation');
    logger.info('Please replace the function in src/services/referralService.js with the updated version');
    
    logger.info('Migration script completed successfully');
  } catch (error) {
    logger.error(`Error in migration: ${error.message}`);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

// Run the script
fixProfileAndReferralTables();
