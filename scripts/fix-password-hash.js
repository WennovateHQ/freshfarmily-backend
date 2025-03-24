/**
 * Fix Password Hash for Test Users
 * 
 * This script directly applies a correctly hashed password to test users
 * to ensure authentication works properly
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { User } = require('../src/models/user');
const { sequelize } = require('../src/config/database');

// Initialize models and associations
require('../src/models/index');

// Password to use for all test accounts
const TEST_PASSWORD = 'password123';

async function createHashAndUpdate() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully!\n');
    
    // Explicitly create a new hash - without using the model hooks
    console.log(`Creating password hash for "${TEST_PASSWORD}"...`);
    // Use a fixed salt for testing purposes
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, salt);
    console.log(`Generated hash: ${hashedPassword}`);
    
    // Verify the hash works as expected
    const isValid = await bcrypt.compare(TEST_PASSWORD, hashedPassword);
    console.log(`Password verification test: ${isValid ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (!isValid) {
      console.error('ERROR: bcrypt hash verification failed! Cannot proceed.');
      process.exit(1);
    }
    
    // Find all test users
    const testUsers = await User.findAll({
      where: {
        email: {
          [sequelize.Op.in]: ['admin@freshfarmily.com', 'consumer@freshfarmily.com', 'test@example.com']
        }
      }
    });
    
    console.log(`Found ${testUsers.length} test users to update.`);
    
    // Update each user's password directly (bypassing hooks)
    for (const user of testUsers) {
      // Use direct query to bypass hooks
      await sequelize.query(
        `UPDATE "Users" SET password = :password WHERE id = :id`,
        {
          replacements: { password: hashedPassword, id: user.id },
          type: sequelize.QueryTypes.UPDATE
        }
      );
      console.log(`Updated password for ${user.email} (ID: ${user.id})`);
      
      // Verify the update
      const updatedUser = await User.findByPk(user.id);
      const passwordVerifies = await bcrypt.compare(TEST_PASSWORD, updatedUser.password);
      console.log(`Verification for ${user.email}: ${passwordVerifies ? '✅ PASSED' : '❌ FAILED'}`);
    }
    
    console.log('\n✅ Password update complete!');
    console.log('\nLogin credentials (all accounts):');
    console.log('Password: password123');
    
    // List available test accounts
    console.log('\nAvailable test accounts:');
    for (const user of testUsers) {
      console.log(`- ${user.email} (${user.role})`);
    }
    
    console.log('\nPlease restart your application server for changes to take effect.');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

// Run the script
createHashAndUpdate();
