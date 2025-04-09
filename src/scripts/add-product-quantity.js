/**
 * Script to add quantityAvailable column to products table
 * This addresses the "column Product.quantityAvailable does not exist" error
 */

const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

async function addQuantityAvailableColumn() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    logger.info('Checking if quantityAvailable column exists in products table...');
    
    // Check if the column exists
    const columnExists = await new Promise((resolve) => {
      sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'quantityAvailable'")
        .then(([results]) => {
          resolve(results.length > 0);
        })
        .catch(() => resolve(false));
    });
    
    if (columnExists) {
      logger.info('quantityAvailable column already exists in products table');
      return;
    }
    
    logger.info('Adding quantityAvailable column to products table...');
    
    // Add the quantityAvailable column
    await queryInterface.addColumn('products', 'quantityAvailable', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    });
    
    // Add index for improved query performance
    await queryInterface.addIndex('products', ['quantityAvailable'], {
      name: 'products_quantity_available_idx'
    });
    
    logger.info('quantityAvailable column added successfully to products table');
  } catch (error) {
    logger.error(`Error adding quantityAvailable column: ${error.message}`);
    throw error;
  }
}

// Run the script
addQuantityAvailableColumn()
  .then(() => {
    logger.info('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    logger.error(`Script failed: ${error.message}`);
    process.exit(1);
  });
