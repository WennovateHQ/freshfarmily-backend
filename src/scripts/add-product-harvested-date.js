/**
 * Script to add harvestedDate column to products table
 * This addresses the "column Product.harvestedDate does not exist" error
 */

const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

async function addHarvestedDateColumn() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    logger.info('Checking if harvestedDate column exists in products table...');
    
    // Check if the column exists
    const columnExists = await new Promise((resolve) => {
      sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'harvestedDate'")
        .then(([results]) => {
          resolve(results.length > 0);
        })
        .catch(() => resolve(false));
    });
    
    if (columnExists) {
      logger.info('harvestedDate column already exists in products table');
      return;
    }
    
    logger.info('Adding harvestedDate column to products table...');
    
    // Add the harvestedDate column
    await queryInterface.addColumn('products', 'harvestedDate', {
      type: DataTypes.DATE,
      allowNull: true
    });
    
    // Add index for improved query performance
    await queryInterface.addIndex('products', ['harvestedDate'], {
      name: 'products_harvested_date_idx'
    });
    
    logger.info('harvestedDate column added successfully to products table');
  } catch (error) {
    logger.error(`Error adding harvestedDate column: ${error.message}`);
    throw error;
  }
}

// Run the script
addHarvestedDateColumn()
  .then(() => {
    logger.info('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    logger.error(`Script failed: ${error.message}`);
    process.exit(1);
  });
