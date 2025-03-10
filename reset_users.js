/**
 * Reset Users Script
 * 
 * This script deletes and recreates users in the database to fix the password hashing issue.
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { User } = require('./src/models/user');
const logger = require('./src/utils/logger');

// Main function to reset users
async function resetUsers() {
  try {
    logger.info('Connecting to database...');
    await sequelize.authenticate();
    logger.info('Database connection established.');

    // Delete all existing users
    logger.info('Deleting all existing users...');
    const deletedCount = await User.destroy({ where: {}, force: true });
    logger.info(`Deleted ${deletedCount} users from the database.`);

    logger.info('Users have been reset. Run seedDb.js again to recreate them.');
    
    await sequelize.close();
    return true;
  } catch (error) {
    logger.error('Error resetting users:', error);
    return false;
  }
}

// Run the function
resetUsers()
  .then(success => {
    if (success) {
      logger.info('User reset completed successfully.');
      process.exit(0);
    } else {
      logger.error('User reset failed.');
      process.exit(1);
    }
  })
  .catch(err => {
    logger.error('Unexpected error:', err);
    process.exit(1);
  });
