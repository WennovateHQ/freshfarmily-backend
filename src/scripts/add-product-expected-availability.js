/**
 * Script to add expectedAvailability column to products table
 * This addresses the "column Product.expectedAvailability does not exist" error
 */

const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

async function addExpectedAvailabilityColumn() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    logger.info('Checking if expectedAvailability column exists in products table...');
    
    // Check if the column exists
    const columnExists = await new Promise((resolve) => {
      sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'expectedAvailability'")
        .then(([results]) => {
          resolve(results.length > 0);
        })
        .catch(() => resolve(false));
    });
    
    if (columnExists) {
      logger.info('expectedAvailability column already exists in products table');
      return;
    }
    
    logger.info('Adding expectedAvailability column to products table...');
    
    // Add the expectedAvailability column
    await queryInterface.addColumn('products', 'expectedAvailability', {
      type: DataTypes.DATE,
      allowNull: true
    });
    
    // Add index for improved query performance
    await queryInterface.addIndex('products', ['expectedAvailability'], {
      name: 'products_expected_availability_idx'
    });
    
    logger.info('expectedAvailability column added successfully to products table');
  } catch (error) {
    logger.error(`Error adding expectedAvailability column: ${error.message}`);
    throw error;
  }
}

// Run the script
addExpectedAvailabilityColumn()
  .then(() => {
    logger.info('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    logger.error(`Script failed: ${error.message}`);
    process.exit(1);
  });
