/**
 * Database Check Script
 * 
 * This script checks the actual database structure to help debug issues
 */

const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

async function checkDatabase() {
  try {
    logger.info('Starting database structure check');
    
    // First check the database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    
    // List all tables
    const [tables] = await sequelize.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_type = 'BASE TABLE'`
    );
    
    logger.info(`Found ${tables.length} tables in database`);
    console.log(tables.map(t => t.table_name).join(', '));
    
    // Check if the referral_info table exists
    if (tables.some(t => t.table_name === 'referral_info')) {
      logger.info('referral_info table exists, checking structure');
      
      // Get all columns in the referral_info table
      const [columns] = await sequelize.query(
        `SELECT column_name, data_type, is_nullable 
         FROM information_schema.columns 
         WHERE table_name = 'referral_info'`
      );
      
      logger.info(`referral_info table has ${columns.length} columns:`);
      console.log(columns.map(c => `${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`).join('\n'));
      
      // Check if the referredBy column exists
      const hasReferredBy = columns.some(c => c.column_name === 'referredBy');
      logger.info(`referredBy column exists: ${hasReferredBy}`);
      
      // If the referredBy column doesn't exist, let's add it
      if (!hasReferredBy) {
        logger.info('Adding referredBy column to referral_info table');
        
        try {
          await sequelize.query(
            `ALTER TABLE referral_info 
             ADD COLUMN "referredBy" UUID REFERENCES users(id)`
          );
          logger.info('Successfully added referredBy column');
        } catch (alterError) {
          logger.error(`Failed to add referredBy column: ${alterError.message}`);
        }
      }
    } else {
      logger.error('referral_info table does not exist!');
    }
    
    logger.info('Database check completed');
  } catch (error) {
    logger.error(`Database check error: ${error.message}`);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

// Run the database check
checkDatabase();
