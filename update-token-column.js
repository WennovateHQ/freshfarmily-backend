/**
 * Script to update the refreshToken column length in the Users table
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { authLogger } = require('./src/utils/logger');

async function updateTokenColumn() {
  try {
    console.log('Starting to update the refreshToken column length...');
    
    // Execute the ALTER TABLE query to change the column type to TEXT
    // TEXT type can store strings of unlimited length
    await sequelize.query(
      'ALTER TABLE "Users" ALTER COLUMN "refreshToken" TYPE TEXT'
    );
    
    console.log('✅ Successfully updated refreshToken column to TEXT type');
    return true;
  } catch (error) {
    console.error('❌ Error updating refreshToken column:', error);
    return false;
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the migration
updateTokenColumn()
  .then(success => {
    console.log(success ? 'Migration completed successfully.' : 'Migration failed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
