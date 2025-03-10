/**
 * Script to check all users in the database
 */

require('dotenv').config();
const { User } = require('./src/models/user');
const logger = require('./src/utils/logger');

async function checkUsers() {
  try {
    logger.info('Checking for all users in the database...');
    
    const users = await User.findAll();
    
    logger.info(`Total users found: ${users.length}`);
    
    if (users.length > 0) {
      logger.info('User details:');
      users.forEach(user => {
        logger.info(`- ${user.email} (${user.role}): ${user.status}`);
        // Log the permissions to verify they're correctly stored and parsed
        logger.info(`  Permissions: ${JSON.stringify(user.permissions)}`);
      });
    } else {
      logger.warn('No users found in the database!');
    }
    
    return users.length > 0;
  } catch (error) {
    logger.error(`Error checking users: ${error.message}`);
    logger.error(error.stack);
    return false;
  }
}

// Run the function and close the connection when done
async function run() {
  const success = await checkUsers();
  if (success) {
    logger.info('Successfully checked all users.');
  } else {
    logger.error('Failed to check users or no users found.');
  }
  
  // Close database connection
  const { sequelize } = require('./src/config/database');
  await sequelize.close();
}

run();
