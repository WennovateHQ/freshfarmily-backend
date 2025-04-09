/**
 * Create Profiles Table and Add Test Users
 * 
 * This script creates the missing Profiles table and adds test users
 * for development purposes.
 */

const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

async function fixProfileAndUsers() {
  try {
    logger.info('Starting profile table fix script...');
    
    // Create Profiles table if it doesn't exist
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY,
        "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        address VARCHAR(255),
        city VARCHAR(255),
        state VARCHAR(255),
        "zipCode" VARCHAR(255),
        phone VARCHAR(255),
        "bio" TEXT,
        "avatarUrl" VARCHAR(255),
        preferences JSONB,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);
    logger.info('Profiles table created or confirmed');
    
    // Check if we have any users
    const [userCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM users;
    `);
    
    // Create test users if there are none
    if (parseInt(userCount[0].count) === 0) {
      logger.info('No users found, creating test users...');
      
      // Create a farmer user
      const farmerId = uuidv4();
      const farmerPassword = await bcrypt.hash('farmer123', 10);
      
      await sequelize.query(`
        INSERT INTO users (
          id, email, password, "firstName", "lastName", 
          role, status, "createdAt", "updatedAt"
        ) VALUES (
          :id, 'farmer@freshfarmily.com', :password, 'Farm', 'Owner', 
          'farmer', 'active', NOW(), NOW()
        )
      `, {
        replacements: { 
          id: farmerId,
          password: farmerPassword
        }
      });
      
      // Create profile for farmer
      const farmerProfileId = uuidv4();
      await sequelize.query(`
        INSERT INTO profiles (
          id, "userId", address, city, state, "zipCode", 
          phone, "createdAt", "updatedAt"
        ) VALUES (
          :id, :userId, '123 Farm Road', 'Farmville', 'CA', '94105',
          '555-123-4567', NOW(), NOW()
        )
      `, {
        replacements: {
          id: farmerProfileId,
          userId: farmerId
        }
      });
      
      // Create a consumer user
      const consumerId = uuidv4();
      const consumerPassword = await bcrypt.hash('consumer123', 10);
      
      await sequelize.query(`
        INSERT INTO users (
          id, email, password, "firstName", "lastName", 
          role, status, "createdAt", "updatedAt"
        ) VALUES (
          :id, 'consumer@freshfarmily.com', :password, 'Happy', 'Customer', 
          'consumer', 'active', NOW(), NOW()
        )
      `, {
        replacements: { 
          id: consumerId,
          password: consumerPassword
        }
      });
      
      // Create profile for consumer
      const consumerProfileId = uuidv4();
      await sequelize.query(`
        INSERT INTO profiles (
          id, "userId", address, city, state, "zipCode", 
          phone, "createdAt", "updatedAt"
        ) VALUES (
          :id, :userId, '456 Main Street', 'San Francisco', 'CA', '94110',
          '555-987-6543', NOW(), NOW()
        )
      `, {
        replacements: {
          id: consumerProfileId,
          userId: consumerId
        }
      });
      
      // Create a farm for the farmer
      const farmId = uuidv4();
      await sequelize.query(`
        INSERT INTO farms (
          id, name, description, address, city, state, "zipCode",
          "farmerId", status, "createdAt", "updatedAt"
        ) VALUES (
          :id, 'Fresh Organic Farm', 'We grow the freshest organic produce', 
          '123 Farm Road', 'Farmville', 'CA', '94105',
          :farmerId, 'active', NOW(), NOW()
        )
      `, {
        replacements: {
          id: farmId,
          farmerId: farmerId
        }
      });
      
      logger.info('Test users created successfully:');
      logger.info('Farmer: farmer@freshfarmily.com / farmer123');
      logger.info('Consumer: consumer@freshfarmily.com / consumer123');
    } else {
      logger.info(`Found ${userCount[0].count} existing users, skipping test user creation`);
    }
    
    logger.info('Profile fix script completed successfully');
  } catch (error) {
    logger.error(`Error in profile fix script: ${error.message}`);
    console.error(error);
  } finally {
    // Don't close the connection
    logger.info('Script completed.');
  }
}

// Run the script
fixProfileAndUsers();
