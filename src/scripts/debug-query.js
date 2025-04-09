/**
 * Debug Database Queries
 * 
 * This script runs direct database queries to debug authentication issues
 */

const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

async function debugQueries() {
  try {
    logger.info('Starting database query debugging...');
    
    // Check the users table structure
    const [userColumns] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    
    console.log('USER TABLE COLUMNS:');
    userColumns.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}`);
    });
    
    // Try to get a specific user directly
    const email = 'farmer@freshfarmily.com';
    console.log(`\nQUERYING USER: ${email}`);
    
    const rawUserQuery = `SELECT * FROM users WHERE email = :email LIMIT 1`;
    console.log('QUERY:', rawUserQuery);
    
    const [userResults] = await sequelize.query(rawUserQuery, {
      replacements: { email }
    });
    
    console.log('QUERY RESULT:');
    console.log(JSON.stringify(userResults, null, 2));
    
    // Check if any users were found
    if (userResults.length === 0) {
      console.log('NO USERS FOUND WITH EMAIL:', email);
    } else {
      const userId = userResults[0].id;
      console.log(`\nFound user with ID: ${userId}`);
      
      // Try to get the profile
      const profileQuery = `SELECT * FROM profiles WHERE "userId" = :userId LIMIT 1`;
      console.log('PROFILE QUERY:', profileQuery);
      
      const [profileResults] = await sequelize.query(profileQuery, {
        replacements: { userId }
      });
      
      console.log('PROFILE QUERY RESULT:');
      console.log(JSON.stringify(profileResults, null, 2));
    }
    
    logger.info('Database query debugging completed');
  } catch (error) {
    logger.error(`Error during debug queries: ${error.message}`);
    console.error(error);
  } finally {
    await sequelize.close();
    logger.info('Debug script completed.');
  }
}

// Run the debug function
debugQueries();
