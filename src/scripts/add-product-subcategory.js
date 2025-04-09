/**
 * Script to add subcategory column to products table
 * This addresses the "column Product.subcategory does not exist" error
 */

const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

async function addSubcategoryColumn() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    logger.info('Checking if subcategory column exists in products table...');
    
    // Check if the column exists
    const columnExists = await new Promise((resolve) => {
      sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'subcategory'")
        .then(([results]) => {
          resolve(results.length > 0);
        })
        .catch(() => resolve(false));
    });
    
    if (columnExists) {
      logger.info('subcategory column already exists in products table');
      return;
    }
    
    logger.info('Adding subcategory column to products table...');
    
    // Add the subcategory column
    await queryInterface.addColumn('products', 'subcategory', {
      type: DataTypes.STRING,
      allowNull: true
    });
    
    // Add index for improved performance
    await queryInterface.addIndex('products', ['subcategory'], {
      name: 'products_subcategory_idx'
    });
    
    logger.info('subcategory column added successfully to products table');
  } catch (error) {
    logger.error(`Error adding subcategory column: ${error.message}`);
    throw error;
  }
}

// Run the script
addSubcategoryColumn()
  .then(() => {
    logger.info('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    logger.error(`Script failed: ${error.message}`);
    process.exit(1);
  });
