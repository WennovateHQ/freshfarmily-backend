/**
 * User Credentials Lister
 * 
 * This script retrieves and displays all users from the database
 * with their credentials (email) and other important information.
 */

const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

async function listUsers() {
  try {
    logger.info('Retrieving users from database...');
    
    // Query all users with their profiles
    const [users] = await sequelize.query(`
      SELECT u.id, u.email, u.role, u.status, u."firstName", u."lastName",
             p.address, p.city, p.state, p."zipCode", p.phone
      FROM users u
      LEFT JOIN profiles p ON p."userId" = u.id
      ORDER BY u."createdAt" DESC;
    `);
    
    if (users.length === 0) {
      logger.warn('No users found in the database');
      return;
    }
    
    logger.info(`Found ${users.length} users in the database`);
    
    // Display user information in a readable format
    users.forEach((user, index) => {
      console.log(`\n----- User ${index + 1} -----`);
      console.log(`ID: ${user.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.firstName} ${user.lastName}`);
      console.log(`Role: ${user.role}`);
      console.log(`Status: ${user.status}`);
      
      if (user.address || user.city || user.state || user.zipCode || user.phone) {
        console.log('Profile Information:');
        if (user.address) console.log(`  Address: ${user.address}`);
        if (user.city) console.log(`  City: ${user.city}`);
        if (user.state) console.log(`  State: ${user.state}`);
        if (user.zipCode) console.log(`  Zip Code: ${user.zipCode}`);
        if (user.phone) console.log(`  Phone: ${user.phone}`);
      } else {
        console.log('No profile information available');
      }
    });
    
    // Print login credentials reminder
    console.log('\n----- Login Credentials -----');
    console.log('For testing purposes, you can use:');
    console.log('Farmer: farmer@freshfarmily.com / farmer123');
    console.log('Consumer: consumer@freshfarmily.com / consumer123');
    
    logger.info('User listing completed');
  } catch (error) {
    logger.error(`Error retrieving users: ${error.message}`);
    console.error(error);
  } finally {
    // Don't close the connection
    logger.info('Script completed.');
  }
}

// Run the script
listUsers();
