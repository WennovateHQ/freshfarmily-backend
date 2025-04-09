/**
 * Add Missing Referral Columns
 * 
 * This script:
 * 1. Checks what columns exist in the referral_info table
 * 2. Adds any missing required columns
 */

const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

async function addReferralColumns() {
  try {
    logger.info('Starting to add missing columns to referral tables');
    
    // Check what columns exist in the referral_info table
    const [columns] = await sequelize.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'referral_info'`
    );
    
    const columnNames = columns.map(c => c.column_name);
    logger.info(`Found columns in referral_info: ${columnNames.join(', ')}`);
    
    // Define required columns and their types
    const requiredColumns = [
      { name: 'farmerReferralCode', type: 'VARCHAR(12)' },
      { name: 'customerReferralCode', type: 'VARCHAR(12)' },
      { name: 'referralStatus', type: "VARCHAR(20) DEFAULT 'active'" },
      { name: 'remainingCredit', type: 'DECIMAL(10,2) DEFAULT 0.00' },
      { name: 'totalEarnedCredit', type: 'DECIMAL(10,2) DEFAULT 0.00' },
      { name: 'freeDeliveriesRemaining', type: 'INTEGER DEFAULT 0' },
      { name: 'totalFreeDeliveries', type: 'INTEGER DEFAULT 0' }
    ];
    
    // Add missing columns
    for (const column of requiredColumns) {
      if (!columnNames.includes(column.name)) {
        logger.info(`Adding missing column: ${column.name}`);
        
        try {
          await sequelize.query(
            `ALTER TABLE referral_info ADD COLUMN "${column.name}" ${column.type}`
          );
          logger.info(`Successfully added column: ${column.name}`);
        } catch (error) {
          logger.error(`Error adding column ${column.name}: ${error.message}`);
        }
      } else {
        logger.info(`Column already exists: ${column.name}`);
      }
    }
    
    // Now add a test referral record for a farmer
    try {
      // Find farmer users
      const [farmers] = await sequelize.query(
        `SELECT id, email FROM users WHERE role = 'farmer' LIMIT 1`
      );
      
      if (farmers.length > 0) {
        const farmer = farmers[0];
        logger.info(`Setting up referral for farmer: ${farmer.email}`);
        
        // Generate unique referral codes
        const farmerCode = `FF${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const customerCode = `FC${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        // Check if this user already has referral info
        const [existingInfo] = await sequelize.query(
          `SELECT id FROM referral_info WHERE "userId" = :userId`,
          {
            replacements: { userId: farmer.id },
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        if (existingInfo) {
          // Update the existing record
          await sequelize.query(`
            UPDATE referral_info 
            SET 
              "farmerReferralCode" = :farmerCode,
              "customerReferralCode" = :customerCode,
              "referralStatus" = 'active'
            WHERE "userId" = :userId
          `, {
            replacements: {
              userId: farmer.id,
              farmerCode,
              customerCode
            }
          });
          
          logger.info(`Updated referral info for farmer ${farmer.email} with codes: ${farmerCode}, ${customerCode}`);
        } else {
          // Create a new record
          await sequelize.query(`
            INSERT INTO referral_info ("userId", "farmerReferralCode", "customerReferralCode", "referralStatus")
            VALUES (:userId, :farmerCode, :customerCode, 'active')
          `, {
            replacements: {
              userId: farmer.id,
              farmerCode,
              customerCode
            }
          });
          
          logger.info(`Created referral info for farmer ${farmer.email} with codes: ${farmerCode}, ${customerCode}`);
        }
      } else {
        logger.warn('No farmer users found');
      }
    } catch (error) {
      logger.error(`Error creating/updating sample referral data: ${error.message}`);
    }
    
    logger.info('Column addition process completed');
  } catch (error) {
    logger.error(`Error in column addition process: ${error.message}`);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

// Run the column addition process
addReferralColumns();
