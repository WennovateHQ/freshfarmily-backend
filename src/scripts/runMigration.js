/**
 * Run Database Migration Script
 * 
 * This script will run the migration to remove pickup fields from the Farm model
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

async function runMigration() {
  try {
    // Connect to database
    await sequelize.authenticate();
    logger.info('Connected to database');
    
    // Start transaction
    const transaction = await sequelize.transaction();
    
    try {
      logger.info('Starting migration to remove pickup fields from farms table');
      
      // Check if columns exist before trying to remove them
      const tableInfo = await sequelize.queryInterface.describeTable('farms');
      
      if (tableInfo.acceptsPickup) {
        logger.info('Removing acceptsPickup column');
        await sequelize.queryInterface.removeColumn('farms', 'acceptsPickup', { transaction });
      } else {
        logger.info('acceptsPickup column does not exist, skipping');
      }
      
      if (tableInfo.pickupInstructions) {
        logger.info('Removing pickupInstructions column');
        await sequelize.queryInterface.removeColumn('farms', 'pickupInstructions', { transaction });
      } else {
        logger.info('pickupInstructions column does not exist, skipping');
      }
      
      // Commit the transaction
      await transaction.commit();
      logger.info('Migration completed successfully');
    } catch (error) {
      // If any error occurs, rollback the transaction
      await transaction.rollback();
      logger.error(`Error during migration: ${error.message}`);
      throw error;
    }
  } catch (error) {
    logger.error(`Failed to run migration: ${error.message}`);
    process.exit(1);
  } finally {
    await sequelize.close();
    logger.info('Database connection closed');
    process.exit(0);
  }
}

// Execute the function
runMigration();
