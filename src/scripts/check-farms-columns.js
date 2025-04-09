/**
 * Script to check columns in the farms table
 */

const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

async function checkFarmsColumns() {
  try {
    logger.info('Checking columns in farms table...');
    
    // Get all columns in the farms table
    const [columns] = await sequelize.query(
      "SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'farms' ORDER BY ordinal_position"
    );
    
    // Log all columns
    logger.info('Farms table columns:');
    columns.forEach(column => {
      logger.info(`Column: ${column.column_name}, Type: ${column.data_type}, Nullable: ${column.is_nullable}`);
    });
    
    return columns;
  } catch (error) {
    logger.error(`Error checking farms columns: ${error.message}`);
    throw error;
  }
}

// Run the script
checkFarmsColumns()
  .then(() => {
    logger.info('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    logger.error(`Script failed: ${error.message}`);
    process.exit(1);
  });
