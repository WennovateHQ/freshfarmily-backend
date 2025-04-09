/**
 * Authentication Test Script
 * 
 * This script directly tests the authentication service with the 
 * known user credentials to verify the service is working correctly.
 */

const { authenticateUser } = require('../services/authService');
const logger = require('../utils/logger');
const { sequelize } = require('../config/database');

async function testAuthentication() {
  try {
    logger.info('Starting authentication test...');
    
    // Test credentials to try
    const testCredentials = [
      { email: 'farmer@freshfarmily.com', password: 'farmer123', role: 'farmer' },
      { email: 'consumer@freshfarmily.com', password: 'consumer123', role: 'consumer' }
    ];
    
    // Testing each credential set
    for (const cred of testCredentials) {
      try {
        logger.info(`Testing login for ${cred.email} (${cred.role})...`);
        
        // Call the authentication service directly
        const user = await authenticateUser(cred.email, cred.password);
        
        if (user) {
          console.log(`\n✅ AUTHENTICATION SUCCESSFUL for ${cred.email}`);
          console.log(`User ID: ${user.id}`);
          console.log(`Name: ${user.firstName} ${user.lastName}`);
          console.log(`Role: ${user.role}`);
          console.log(`Status: ${user.status}`);
          
          if (user.Profile) {
            console.log('Profile Information:');
            console.log(`  Address: ${user.Profile.address || 'N/A'}`);
            console.log(`  City: ${user.Profile.city || 'N/A'}`);
            console.log(`  State: ${user.Profile.state || 'N/A'}`);
          }
          
          logger.info(`Authentication successful for ${cred.email}`);
        } else {
          console.log(`\n❌ AUTHENTICATION FAILED for ${cred.email}`);
          logger.error(`Authentication returned null for ${cred.email}`);
        }
      } catch (authError) {
        console.log(`\n❌ AUTHENTICATION ERROR for ${cred.email}: ${authError.message}`);
        logger.error(`Authentication error for ${cred.email}: ${authError.message}`);
        
        // Debug: Try direct database query
        console.log(`\nDEBUG: Checking user in database directly...`);
        const [users] = await sequelize.query(`
          SELECT id, email, password, role, status 
          FROM users 
          WHERE email = :email
        `, {
          replacements: { email: cred.email }
        });
        
        if (users && users.length > 0) {
          console.log(`User found in database: ${users[0].email}`);
          console.log(`Status: ${users[0].status}`);
          console.log(`Role: ${users[0].role}`);
          console.log(`Password hash exists: ${users[0].password ? 'Yes' : 'No'}`);
        } else {
          console.log(`No user found in database with email: ${cred.email}`);
        }
      }
      
      console.log('------------------------------------');
    }
    
    logger.info('Authentication test completed');
  } catch (error) {
    logger.error(`Error in authentication test: ${error.message}`);
    console.error(error);
  } finally {
    // Close database connection when done
    await sequelize.close();
    logger.info('Test script completed.');
  }
}

// Run the test
testAuthentication();
