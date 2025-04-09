/**
 * Script to add the farmerId column to the farms table if it doesn't exist
 * This addresses the "column Farm.farmerId does not exist" error
 */

const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

async function addFarmerIdColumn() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    logger.info('Checking if farmerId column exists in farms table...');
    
    // Check if the column exists
    const [result] = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'farms' AND column_name = 'farmerId'"
    );
    
    if (result.length > 0) {
      logger.info('farmerId column already exists in farms table');
      return;
    }
    
    logger.info('Adding farmerId column to farms table...');
    
    // Add the farmerId column
    await queryInterface.addColumn('farms', 'farmerId', {
      type: DataTypes.UUID,
      allowNull: true, // Set to true initially to avoid errors with existing data
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
    
    logger.info('Added farmerId column to farms table');
    
    // Add index on farmerId
    await queryInterface.addIndex('farms', ['farmerId'], {
      name: 'farms_farmerId_idx'
    });
    
    logger.info('Added index on farmerId column');
    
  } catch (error) {
    logger.error(`Error adding farmerId column: ${error.message}`);
    throw error;
  }
}

// Run the migration
addFarmerIdColumn()
  .then(() => {
    logger.info('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    logger.error(`Script failed: ${error.message}`);
    process.exit(1);
  });
