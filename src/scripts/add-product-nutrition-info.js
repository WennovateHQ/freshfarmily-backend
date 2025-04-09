/**
 * Script to add nutritionInfo column to products table
 * This addresses the "column Product.nutritionInfo does not exist" error
 */

const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

async function addNutritionInfoColumn() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    logger.info('Checking if nutritionInfo column exists in products table...');
    
    // Check if the column exists
    const columnExists = await new Promise((resolve) => {
      sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'nutritionInfo'")
        .then(([results]) => {
          resolve(results.length > 0);
        })
        .catch(() => resolve(false));
    });
    
    if (columnExists) {
      logger.info('nutritionInfo column already exists in products table');
      return;
    }
    
    logger.info('Adding nutritionInfo column to products table...');
    
    // Add the nutritionInfo column as JSON type to store nutrition facts
    await queryInterface.addColumn('products', 'nutritionInfo', {
      type: DataTypes.JSONB,  // Using JSONB for better performance and indexing
      allowNull: true,
      defaultValue: {}
    });
    
    logger.info('nutritionInfo column added successfully to products table');
  } catch (error) {
    logger.error(`Error adding nutritionInfo column: ${error.message}`);
    throw error;
  }
}

// Run the script
addNutritionInfoColumn()
  .then(() => {
    logger.info('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    logger.error(`Script failed: ${error.message}`);
    process.exit(1);
  });
