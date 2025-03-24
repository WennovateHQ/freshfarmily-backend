/**
 * Check Users in Database
 * 
 * Simple script to check if users exist in the database
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// Set up a direct database connection
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function checkUsers() {
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('Database connection established successfully!\n');
    
    // Query for users
    const [users] = await sequelize.query('SELECT * FROM "Users"');
    console.log(`Found ${users.length} users in the database:\n`);
    
    // Display user information
    if (users.length > 0) {
      users.forEach(user => {
        console.log(`User ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.roleId || user.role || 'Not specified'}`);
        console.log(`First Name: ${user.firstName || 'Not specified'}`);
        console.log(`Last Name: ${user.lastName || 'Not specified'}`);
        console.log(`Status: ${user.status}`);
        console.log('-------------------');
      });
    } else {
      console.log('No users found in the database. The seed may not have worked properly.');
    }
    
    // Check profiles too
    const [profiles] = await sequelize.query('SELECT * FROM "Profiles"');
    console.log(`\nFound ${profiles.length} profiles in the database:\n`);
    
    if (profiles.length > 0) {
      profiles.forEach(profile => {
        console.log(`Profile ID: ${profile.id}`);
        console.log(`User ID: ${profile.userId}`);
        console.log(`First Name: ${profile.firstName || 'Not specified'}`);
        console.log(`Last Name: ${profile.lastName || 'Not specified'}`);
        console.log('-------------------');
      });
    } else {
      console.log('No profiles found in the database.');
    }
    
  } catch (error) {
    console.error('Error checking database:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkUsers();
