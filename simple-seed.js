/**
 * Simplified database seed script for FreshFarmily
 * 
 * This script focuses only on creating the necessary users for authentication testing
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { User } = require('./src/models/user');
const { v4: uuidv4 } = require('uuid');
const logger = require('./src/utils/logger');

// Create just the Users table and add test users
async function seedUsers() {
  logger.info('Starting simplified user seed process...');
  logger.info(`Database config: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
  
  try {
    // Test database connection first
    logger.info('Testing database connection...');
    await sequelize.authenticate();
    logger.info('Database connection successful');
    
    // Get database information
    const dbInfo = await sequelize.getQueryInterface().databaseVersion();
    logger.info(`Database version: ${dbInfo}`);
    
    // First sync the User model with the database
    logger.info('Syncing User model with database...');
    await User.sync({ force: true });
    
    logger.info('User model synced successfully.');
    
    // Create test users with plain text passwords - the model will hash them
    const users = [
      {
        id: uuidv4(),
        email: 'admin@freshfarmily.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        permissions: JSON.stringify(['read', 'write', 'update', 'delete', 'admin']),
        status: 'active',
        emailVerified: true
      },
      {
        id: uuidv4(),
        email: 'farmer@freshfarmily.com',
        password: 'farmer123',
        firstName: 'Farmer',
        lastName: 'User',
        role: 'farmer',
        permissions: JSON.stringify(['read', 'write', 'update', 'delete_own']),
        status: 'active',
        emailVerified: true
      },
      {
        id: uuidv4(),
        email: 'driver@freshfarmily.com',
        password: 'driver123',
        firstName: 'Driver',
        lastName: 'User',
        role: 'driver',
        permissions: JSON.stringify(['read', 'update_delivery']),
        status: 'active',
        emailVerified: true
      },
      {
        id: uuidv4(),
        email: 'consumer@freshfarmily.com',
        password: 'consumer123',
        firstName: 'Consumer',
        lastName: 'User',
        role: 'consumer',
        permissions: JSON.stringify(['read', 'create_order']),
        status: 'active',
        emailVerified: true
      },
      // Create a test user with simple credentials
      {
        id: uuidv4(),
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'consumer',
        permissions: JSON.stringify(['read', 'create_order']),
        status: 'active',
        emailVerified: true
      }
    ];
    
    // Create all users
    for (const userData of users) {
      try {
        const user = await User.create(userData);
        logger.info(`Created user: ${userData.email} (${userData.role}) with ID: ${user.id}`);
      } catch (error) {
        logger.error(`Failed to create user ${userData.email}: ${error.message}`);
      }
    }
    
    logger.info('Seeding process completed. Checking created users...');
    
    // List the users we created
    const createdUsers = await User.findAll();
    logger.info(`Total users created and verified in database: ${createdUsers.length}`);
    createdUsers.forEach(user => {
      logger.info(`- ${user.email} (${user.role}): ${user.status}`);
    });
    
    if (createdUsers.length === 0) {
      logger.error('NO USERS WERE FOUND IN THE DATABASE AFTER SEEDING! This indicates a serious issue.');
    } else {
      logger.info('\nYou can now use these accounts to test authentication:');
      logger.info('- admin@freshfarmily.com / admin123 (Admin role)');
      logger.info('- farmer@freshfarmily.com / farmer123 (Farmer role)');
      logger.info('- driver@freshfarmily.com / driver123 (Driver role)');
      logger.info('- consumer@freshfarmily.com / consumer123 (Consumer role)');
      logger.info('- test@example.com / password123 (Consumer role - easy to remember)');
    }
    
    return createdUsers.length > 0;
  } catch (error) {
    logger.error(`Error seeding users: ${error.message}`);
    logger.error(error.stack);
    return false;
  }
}

// Run the seeding process
async function run() {
  try {
    const success = await seedUsers();
    
    if (success) {
      logger.info('User seed process completed successfully.');
    } else {
      logger.error('User seed process failed.');
    }
  } catch (error) {
    logger.error(`Unexpected error during seed process: ${error.message}`);
  } finally {
    // Close the database connection
    await sequelize.close();
    logger.info('Database connection closed.');
  }
}

// Execute the script
run();
