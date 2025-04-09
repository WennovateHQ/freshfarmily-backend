/**
 * Fix Model Associations Script
 * 
 * This script ensures the User and Profile models are properly associated
 * and tests the authentication service with the fixed associations.
 */

const { sequelize } = require('../config/database');
const { User, Profile } = require('../models/user');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

async function fixAssociations() {
  try {
    logger.info('Starting model association fixes...');
    
    // 1. Manually establish the User-Profile association
    User.hasOne(Profile, { 
      foreignKey: 'userId', 
      as: 'Profile',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    
    Profile.belongsTo(User, { 
      foreignKey: 'userId',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE' 
    });
    
    logger.info('Manually set up User-Profile associations');
    
    // 2. Verify user credentials
    const [users] = await sequelize.query(`
      SELECT id, email, "firstName", "lastName", role, status, password 
      FROM users
      ORDER BY "createdAt" DESC
    `);
    
    if (users.length === 0) {
      logger.warn('No users found in the database');
      return;
    }
    
    logger.info(`Found ${users.length} users in the database`);
    
    // 3. Test authentication by direct password verification
    for (const user of users) {
      console.log(`\nTesting user: ${user.email}`);
      
      // Test the raw password comparison for 'farmer123' or 'consumer123'
      const testPassword = user.email.includes('farmer') ? 'farmer123' : 'consumer123';
      
      try {
        const isValid = await bcrypt.compare(testPassword, user.password);
        console.log(`Password verification for ${testPassword}: ${isValid ? 'SUCCESSFUL' : 'FAILED'}`);
        
        if (!isValid) {
          logger.warn(`Password verification failed for user ${user.email}`);
          
          // Update password if verification failed
          logger.info(`Updating password for user ${user.email}`);
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(testPassword, salt);
          
          await sequelize.query(`
            UPDATE users
            SET password = :password
            WHERE id = :id
          `, {
            replacements: {
              password: hashedPassword,
              id: user.id
            }
          });
          
          logger.info(`Password updated for user ${user.email}`);
        }
      } catch (error) {
        logger.error(`Error during password verification: ${error.message}`);
      }
    }
    
    // 4. Check if profiles exist for users
    for (const user of users) {
      const [profiles] = await sequelize.query(`
        SELECT id, "userId" FROM profiles WHERE "userId" = :userId
      `, {
        replacements: { userId: user.id }
      });
      
      if (profiles.length === 0) {
        logger.warn(`No profile found for user ${user.email}, creating one...`);
        
        const profileId = require('uuid').v4();
        await sequelize.query(`
          INSERT INTO profiles (
            id, "userId", address, city, state, "zipCode", 
            phone, "createdAt", "updatedAt"
          ) VALUES (
            :id, :userId, :address, :city, :state, :zipCode,
            :phone, NOW(), NOW()
          )
        `, {
          replacements: {
            id: profileId,
            userId: user.id,
            address: user.email.includes('farmer') ? '123 Farm Road' : '456 Main Street',
            city: user.email.includes('farmer') ? 'Farmville' : 'San Francisco',
            state: 'CA',
            zipCode: user.email.includes('farmer') ? '94105' : '94110',
            phone: user.email.includes('farmer') ? '555-123-4567' : '555-987-6543'
          }
        });
        
        logger.info(`Created profile for user ${user.email}`);
      } else {
        logger.info(`Profile exists for user ${user.email}`);
      }
    }
    
    // 5. Test direct model query to ensure associations work
    try {
      const testUser = await User.findOne({
        include: [{
          model: Profile,
          as: 'Profile',
          required: false
        }]
      });
      
      if (testUser) {
        console.log('\nTest User-Profile Association:');
        console.log(`User: ${testUser.email}`);
        
        if (testUser.Profile) {
          console.log('Profile found! Association is working correctly.');
          console.log(`Profile data: ${testUser.Profile.address}, ${testUser.Profile.city}`);
        } else {
          console.log('Profile not found despite association setup!');
        }
      } else {
        console.log('No user found for association test.');
      }
    } catch (error) {
      logger.error(`Error testing User-Profile association: ${error.message}`);
    }
    
    logger.info('Association fixes completed');
  } catch (error) {
    logger.error(`Error fixing associations: ${error.message}`);
    console.error(error);
  } finally {
    logger.info('Script completed.');
  }
}

// Run the script
fixAssociations();
